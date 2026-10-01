import { describe, expect, it } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";

import { drawBook, surpriseGenres, surprisePool } from "./surprise";

describe("me surpreenda", () => {
  const books = referenceBooks();
  it("lista os gêneros dos não lidos, por quantidade", () => {
    const g = surpriseGenres(books);
    expect(g.unread).toBe(4);
    expect(g.options[0]).toEqual({ value: "todos", label: "Todos os gêneros (4)" });
  });
  it("não repete o último sorteado quando há outras opções", () => {
    const pool = surprisePool(books, "todos");
    for (let i = 0; i < 20; i++) expect(drawBook(pool, pool[0].id)?.id).not.toBe(pool[0].id);
    const single = [makeBook({ status: "nao-lido" })];
    expect(drawBook(single, single[0].id)).toBe(single[0]);
    expect(drawBook([], null)).toBeNull();
  });
});
