"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import type { Book, BookFields } from "@/lib/domain/types";

export const BOOKS_KEY = ["books"] as const;

export function useBooks(): Book[] {
  const { data } = useQuery({
    queryKey: BOOKS_KEY,
    queryFn: async () => (await api.get<{ books: Book[] }>("/api/books")).books,
    staleTime: 60_000,
  });
  return data ?? [];
}

type Patch = Partial<BookFields>;

/** PATCHs de livros em fila por `id`, compartilhada por todas as chamadas do hook. */
const bookWrites = createBookWriteQueue();

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
  const fail = (error: Error) =>
    toast(error.message || "Não foi possível salvar. Tente de novo.", {
      type: "error",
    });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Patch }) =>
      bookWrites.run(id, optimisticFields(patch), () =>
        api.patch<{ book: Book }>(`/api/books/${id}`, patch)
      ),
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
    onError: (e, _v, ctx) => {
      if (ctx) {
        setBooks((bs) => revertBookPatch(bs, ctx.id, ctx.applied, ctx.prev));
      }
      fail(e);
    },
    onSuccess: ({ book }) =>
      setBooks((bs) => settleBook(bs, book, bookWrites.pendingFields(book.id))),
  });

  const create = useMutation({
    mutationFn: (fields: Patch & { title: string }) =>
      api.post<{ book: Book }>("/api/books", fields),
    onSuccess: ({ book }) => setBooks((bs) => [book, ...bs]),
    onError: (e) => toast(e.message, { type: "error" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/books/${id}`),
    onMutate: (id) => {
      const list = cached();
      const index = list.findIndex((b) => b.id === id);
      if (index < 0) {
        return;
      }
      const book = list[index];
      setBooks((bs) => bs.filter((b) => b.id !== id));
      return { book, index };
    },
    onError: (e, _v, ctx) => {
      if (ctx) {
        setBooks((bs) => restoreRemovedBook(bs, ctx.book, ctx.index));
      }
      fail(e);
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
    create: (fields: Patch & { title: string }) => create.mutateAsync(fields),
    /** Exclui um livro (otimista). Resolve `true`/`false` como `update`. */
    remove: (id: string) =>
      remove.mutateAsync(id).then(
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
