"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/app/toast";
import { api } from "@/lib/client/api";
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

/** Mutações do acervo com atualização otimista e rollback (toast de erro). */
export function useBookActions() {
  const qc = useQueryClient();
  const snapshot = () => qc.getQueryData<Book[]>(BOOKS_KEY) ?? [];
  const setBooks = (fn: (books: Book[]) => Book[]) => qc.setQueryData<Book[]>(BOOKS_KEY, (old) => fn(old ?? []));
  const fail = (prev: Book[]) => (error: Error) => {
    qc.setQueryData(BOOKS_KEY, prev);
    toast(error.message || "Não foi possível salvar. Tente de novo.");
  };

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Patch }) => api.patch<{ book: Book }>(`/api/books/${id}`, patch),
    onMutate: ({ id, patch }) => {
      const prev = snapshot();
      setBooks((bs) =>
        bs.map((b) =>
          b.id === id ? { ...b, ...patch, ...(patch.status && patch.status !== "emprestado" ? { borrower: null } : {}) } : b,
        ),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => fail(ctx?.prev ?? [])(e),
    onSuccess: ({ book }) => setBooks((bs) => bs.map((b) => (b.id === book.id ? book : b))),
  });

  const create = useMutation({
    mutationFn: (fields: Patch & { title: string }) => api.post<{ book: Book }>("/api/books", fields),
    onSuccess: ({ book }) => setBooks((bs) => [book, ...bs]),
    onError: (e) => toast(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/books/${id}`),
    onMutate: (id) => {
      const prev = snapshot();
      setBooks((bs) => bs.filter((b) => b.id !== id));
      return { prev };
    },
    onError: (e, _v, ctx) => fail(ctx?.prev ?? [])(e),
  });

  return {
    /** Atualiza um livro (otimista). */
    update: (id: string, patch: Patch) => update.mutateAsync({ id, patch }).catch(() => undefined),
    create: (fields: Patch & { title: string }) => create.mutateAsync(fields),
    remove: (id: string) => remove.mutateAsync(id).catch(() => undefined),
    /** Substitui o cache inteiro (após importar/sincronizar). */
    replaceAll: (books: Book[]) => qc.setQueryData(BOOKS_KEY, books),
    refetch: () => qc.invalidateQueries({ queryKey: BOOKS_KEY }),
    /** Aplica um patch local sem chamar a API (o lote de capas grava depois). */
    patchLocal: (id: string, patch: Patch) => setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    saving: create.isPending,
  };
}
