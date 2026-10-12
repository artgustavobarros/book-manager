import { describe, expect, it } from "vitest";

import type { Book, BookFields } from "@/lib/domain/types";
import { makeBook } from "@/tests/support/reference";

import {
  applyBookPatch,
  optimisticFields,
  pickFields,
  restoreRemovedBook,
  revertBookPatch,
} from "./book-cache";

/** Simula o `onMutate` de uma edição: aplica o patch e devolve como desfazê-lo. */
function mutate(books: Book[], id: string, patch: Partial<BookFields>) {
  const applied = optimisticFields(patch);
  const prev = pickFields(books.find((b) => b.id === id)!, applied);
  return {
    books: applyBookPatch(books, id, applied),
    fail: (current: Book[]) => revertBookPatch(current, id, applied, prev),
  };
}

const byId = (books: Book[], id: string) => books.find((b) => b.id === id);

describe("rollback de edição", () => {
  it("falha em A preserva B editado, criado e excluído depois", () => {
    const [a, b, c] = [makeBook(), makeBook(), makeBook()];
    const m = mutate([a, b, c], a.id, { status: "lido" });
    const novo = makeBook({ title: "Novo" });
    let books = applyBookPatch(m.books, b.id, { favorite: true });
    books = [novo, ...books.filter((x) => x.id !== c.id)];

    books = m.fail(books);

    expect(byId(books, a.id)?.status).toBe("nao-lido");
    expect(byId(books, b.id)?.favorite).toBe(true);
    expect(byId(books, novo.id)).toEqual(novo);
    expect(byId(books, c.id)).toBeUndefined();
  });

  it("falha em A preserva capas aplicadas pela fila em A e em B", () => {
    const [a, b] = [makeBook(), makeBook()];
    const m = mutate([a, b], a.id, { favorite: true });
    let books = applyBookPatch(m.books, b.id, { coverUrl: "b.jpg" });
    books = applyBookPatch(books, a.id, { coverUrl: "a.jpg" });

    books = m.fail(books);

    expect(byId(books, a.id)).toMatchObject({
      favorite: false,
      coverUrl: "a.jpg",
    });
    expect(byId(books, b.id)?.coverUrl).toBe("b.jpg");
  });

  it("campo do patch mudado depois no mesmo livro não é revertido", () => {
    const a = makeBook();
    const m1 = mutate([a], a.id, { favorite: true, status: "lido" });
    const m2 = mutate(m1.books, a.id, { status: "lendo" });

    const books = m1.fail(m2.books);

    expect(byId(books, a.id)).toMatchObject({
      favorite: false,
      status: "lendo",
    });
  });

  it("devolve o borrower limpo pela saída de emprestado", () => {
    const a = makeBook({ status: "emprestado", borrower: "Bia" });
    const m = mutate([a], a.id, { status: "lido" });
    expect(byId(m.books, a.id)?.borrower).toBeNull();

    const books = m.fail(m.books);

    expect(byId(books, a.id)).toMatchObject({
      status: "emprestado",
      borrower: "Bia",
    });
  });

  it("não faz nada se o livro saiu do cache", () => {
    const [a, b] = [makeBook(), makeBook()];
    const m = mutate([a, b], a.id, { status: "lido" });
    const books = [b];

    expect(m.fail(books)).toEqual([b]);
  });
});

describe("rollback de exclusão", () => {
  it("reinsere só o livro cuja exclusão falhou, na posição antiga", () => {
    const [a, b, c] = [makeBook(), makeBook(), makeBook()];
    // A saiu da lista com o DELETE pendente; depois B foi excluído com sucesso.
    const books = [c];

    expect(restoreRemovedBook(books, a, 0)).toEqual([a, c]);
    expect(restoreRemovedBook([a, c], b, 1)).toEqual([a, b, c]);
  });

  it("limita a posição ao tamanho atual da lista", () => {
    const [a, b] = [makeBook(), makeBook()];

    expect(restoreRemovedBook([a], b, 5)).toEqual([a, b]);
  });

  it("não duplica um livro que já voltou ao cache", () => {
    const [a, b] = [makeBook(), makeBook()];

    expect(restoreRemovedBook([a, b], b, 0)).toEqual([a, b]);
  });
});
