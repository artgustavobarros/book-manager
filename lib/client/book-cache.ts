import type { Book, BookFields } from "@/lib/domain/types";

/**
 * Atualizações otimistas do cache de livros. O rollback de uma mutação que falhou
 * desfaz só o que ela mudou, para não apagar o que chegou ao cache nesse meio-tempo
 * (outro livro criado, editado ou excluído, capas aplicadas pela fila).
 */

type Patch = Partial<BookFields>;

/** Patch efetivo de uma edição: sair de "emprestado" limpa o `borrower`. */
export function optimisticFields(patch: Patch): Patch {
  return patch.status && patch.status !== "emprestado"
    ? { ...patch, borrower: null }
    : patch;
}

export function applyBookPatch(
  books: Book[],
  id: string,
  fields: Patch
): Book[] {
  return books.map((b) => (b.id === id ? { ...b, ...fields } : b));
}

/** Valores que o livro tinha nos campos que o patch vai mudar. */
export function pickFields(book: Book, fields: Patch): Patch {
  const keys = Object.keys(fields) as (keyof BookFields)[];
  return Object.fromEntries(keys.map((k) => [k, book[k]])) as Patch;
}

/**
 * Desfaz o patch `applied` no livro `id`: cada campo volta ao valor de `prev` só se
 * ainda tiver o valor otimista, preservando mudanças posteriores no mesmo livro.
 */
export function revertBookPatch(
  books: Book[],
  id: string,
  applied: Patch,
  prev: Patch
): Book[] {
  const keys = Object.keys(applied) as (keyof BookFields)[];
  return books.map((b) => {
    if (b.id !== id) {
      return b;
    }
    const back = keys.filter((k) => b[k] === applied[k]);
    return back.length
      ? { ...b, ...Object.fromEntries(back.map((k) => [k, prev[k]])) }
      : b;
  });
}

/**
 * Põe no cache o livro que o servidor devolveu, com os campos das edições ainda
 * pendentes nesse livro por cima, para a resposta não desfazer o que vem depois dela.
 */
export function settleBook(
  books: Book[],
  serverBook: Book,
  pending: Patch
): Book[] {
  return books.map((b) =>
    b.id === serverBook.id ? { ...serverBook, ...pending } : b
  );
}

/** Devolve um livro cuja exclusão falhou, sem duplicar se ele já voltou ao cache. */
export function restoreRemovedBook(
  books: Book[],
  book: Book,
  index: number
): Book[] {
  if (books.some((b) => b.id === book.id)) {
    return books;
  }
  const at = Math.min(Math.max(index, 0), books.length);
  return [...books.slice(0, at), book, ...books.slice(at)];
}
