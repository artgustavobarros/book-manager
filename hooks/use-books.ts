"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toast } from "@/components/app/toast";
import { api } from "@/lib/client/api";
import {
  applyBookPatch,
  optimisticFields,
  pickFields,
  restoreRemovedBook,
  revertBookPatch,
  settleBook,
} from "@/lib/client/book-cache";
import { createBookWriteQueue } from "@/lib/client/book-write-queue";
import {
  OFFLINE_MUTATION_META,
  offlineMutationRetry,
  offlineMutationRetryDelay,
} from "@/lib/client/offline-persistence";
import type { Book, BookFields } from "@/lib/domain/types";

export const BOOKS_KEY = ["books"] as const;
export const BOOK_CREATE_MUTATION_KEY = ["books", "create"] as const;
export const BOOK_UPDATE_MUTATION_KEY = ["books", "update"] as const;
export const BOOK_DELETE_MUTATION_KEY = ["books", "delete"] as const;

export function useBooks(): Book[] {
  const { data } = useQuery({
    queryKey: BOOKS_KEY,
    queryFn: async () => (await api.get<{ books: Book[] }>("/api/books")).books,
    staleTime: 60_000,
  });
  return data ?? [];
}

type Patch = Partial<BookFields>;
type CreateVariables = { fields: Patch & { title: string }; id: string };
type UpdateVariables = { id: string; patch: Patch };
type DeleteVariables = { id: string };
type UpdateContext = { applied: Patch; id: string; prev: Patch };
type DeleteContext = { book: Book; index: number };

/** PATCHs de livros em fila por `id`, compartilhada por todas as chamadas do hook. */
const bookWrites = createBookWriteQueue();

function createOnServer({ id, fields }: CreateVariables) {
  return api.post<{ book: Book }>("/api/books", { id, ...fields });
}

function updateOnServer({ id, patch }: UpdateVariables) {
  return bookWrites.run(id, optimisticFields(patch), () =>
    api.patch<{ book: Book }>(`/api/books/${id}`, patch)
  );
}

function deleteOnServer({ id }: DeleteVariables) {
  return api.del(`/api/books/${id}`);
}

/** Defaults let persisted mutations resume after their component has unmounted. */
export function configureBookMutationDefaults(client: QueryClient) {
  client.setMutationDefaults<{ book: Book }, Error, CreateVariables, void>(
    BOOK_CREATE_MUTATION_KEY,
    {
      mutationFn: createOnServer,
      meta: OFFLINE_MUTATION_META,
      networkMode: "online",
      retry: offlineMutationRetry,
      retryDelay: offlineMutationRetryDelay,
      onSuccess: ({ book }) => {
        client.setQueryData<Book[]>(BOOKS_KEY, (old) => {
          const books = old ?? [];
          return books.some((item) => item.id === book.id)
            ? books.map((item) => (item.id === book.id ? book : item))
            : [book, ...books];
        });
      },
      onError: (error) => fail(error),
    }
  );
  client.setMutationDefaults<
    { book: Book },
    Error,
    UpdateVariables,
    UpdateContext
  >(BOOK_UPDATE_MUTATION_KEY, {
    mutationFn: updateOnServer,
    meta: OFFLINE_MUTATION_META,
    networkMode: "online",
    retry: offlineMutationRetry,
    retryDelay: offlineMutationRetryDelay,
    onSuccess: ({ book }) =>
      client.setQueryData<Book[]>(BOOKS_KEY, (old) =>
        settleBook(old ?? [], book, bookWrites.pendingFields(book.id))
      ),
    onError: (error, _variables, context) => {
      if (context) {
        client.setQueryData<Book[]>(BOOKS_KEY, (old) =>
          revertBookPatch(old ?? [], context.id, context.applied, context.prev)
        );
      }
      fail(error);
    },
  });
  client.setMutationDefaults<void, Error, DeleteVariables, DeleteContext>(
    BOOK_DELETE_MUTATION_KEY,
    {
      mutationFn: deleteOnServer,
      meta: OFFLINE_MUTATION_META,
      networkMode: "online",
      retry: offlineMutationRetry,
      retryDelay: offlineMutationRetryDelay,
      onSuccess: (_data, { id }) =>
        client.setQueryData<Book[]>(BOOKS_KEY, (old) =>
          (old ?? []).filter((book) => book.id !== id)
        ),
      onError: (error, _variables, context) => {
        if (context) {
          client.setQueryData<Book[]>(BOOKS_KEY, (old) =>
            restoreRemovedBook(old ?? [], context.book, context.index)
          );
        }
        fail(error);
      },
    }
  );
}

function fail(error: Error) {
  toast(error.message || "Não foi possível salvar. Tente de novo.", {
    type: "error",
  });
}

/**
 * Mutações do acervo com atualização otimista e rollback (toast de erro). O rollback
 * desfaz só o que a mutação que falhou mudou, sem apagar o resto do cache. As edições
 * de um mesmo livro vão ao servidor uma de cada vez, na ordem em que foram feitas, e a
 * resposta de uma não desfaz na tela as que ainda estão pendentes.
 */
export function useBookActions() {
  const qc = useQueryClient();
  const cached = () => qc.getQueryData<Book[]>(BOOKS_KEY) ?? [];
  const setBooks = (fn: (books: Book[]) => Book[]) =>
    qc.setQueryData<Book[]>(BOOKS_KEY, (old) => fn(old ?? []));

  const update = useMutation({
    mutationKey: BOOK_UPDATE_MUTATION_KEY,
    mutationFn: updateOnServer,
    onMutate: ({ id, patch }) => {
      const book = cached().find((b) => b.id === id);
      if (!book) {
        return;
      }
      const applied = optimisticFields(patch);
      const prev = pickFields(book, applied);
      setBooks((bs) => applyBookPatch(bs, id, applied));
      return { id, applied, prev };
    },
  });

  const create = useMutation({
    mutationKey: BOOK_CREATE_MUTATION_KEY,
    mutationFn: createOnServer,
  });

  const remove = useMutation({
    mutationKey: BOOK_DELETE_MUTATION_KEY,
    mutationFn: deleteOnServer,
    onMutate: ({ id }) => {
      const list = cached();
      const index = list.findIndex((b) => b.id === id);
      if (index < 0) {
        return;
      }
      const book = list[index];
      setBooks((bs) => bs.filter((b) => b.id !== id));
      return { book, index };
    },
  });

  return {
    /**
     * Atualiza um livro (otimista). Resolve `true` quando a API confirma e `false` na
     * falha (já desfeita e avisada por toast): o toast de sucesso fica com quem chama.
     */
    update: (id: string, patch: Patch) =>
      update.mutateAsync({ id, patch }).then(
        () => true,
        () => false
      ),
    create: (fields: Patch & { title: string }) =>
      create.mutateAsync({ id: crypto.randomUUID(), fields }),
    /** Exclui um livro (otimista). Resolve `true`/`false` como `update`. */
    remove: (id: string) =>
      remove.mutateAsync({ id }).then(
        () => true,
        () => false
      ),
    /** Substitui o cache inteiro (após importar/sincronizar). */
    replaceAll: (books: Book[]) => qc.setQueryData(BOOKS_KEY, books),
    refetch: () => qc.invalidateQueries({ queryKey: BOOKS_KEY }),
    /** Aplica um patch local sem chamar a API (o lote de capas grava depois). */
    patchLocal: (id: string, patch: Patch) =>
      setBooks((bs) => applyBookPatch(bs, id, patch)),
    saving: create.isPending,
  };
}
