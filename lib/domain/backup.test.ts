import { describe, expect, it } from "vitest";

import raw from "@/tests/fixtures/reference-books.json";
import { makeBook } from "@/tests/support/reference";

import {
  fromBackup,
  InvalidBackupError,
  toBackup,
  toIsoDate,
  toPositiveInt,
} from "./backup";

describe("fromBackup", () => {
  it("converte o backup do standalone para os tipos do modelo", () => {
    const books = fromBackup(raw);
    expect(books).toHaveLength(30);
    const b = books[0];
    expect(b).toMatchObject({
      orderNo: 1,
      title: "1984",
      author: "George Orwell",
      pages: 416,
      yearPublished: 1949,
      yearRead: 2023,
      acquiredOn: "2023-04-12",
      status: "lido",
      authorGender: "Homem",
      favorite: false,
      notes: null,
      coverUrl: null,
    });
    const lent = books.find((x) => x.title === "Dom Casmurro")!;
    expect(lent).toMatchObject({
      status: "emprestado",
      borrower: "Ana",
      notes: "Emprestado em março.",
    });
  });

  it("aceita fav e coverTried e ignora entradas sem título", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const books = fromBackup(
      [
        { title: "A", pages: "416", fav: true, coverTried: 1, status: "xyz" },
        { title: "  " },
        null,
        { author: "x" },
      ],
      now
    );
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      pages: 416,
      favorite: true,
      coverCheckedAt: now.toISOString(),
      status: "nao-lido",
      orderNo: 1,
    });
  });

  it("rejeita o que não é array", () => {
    expect(() => fromBackup({ books: [] })).toThrow(InvalidBackupError);
  });

  it("rejeita backup sem nenhum livro com título", () => {
    for (const data of [[], [{}], [1, 2, 3], [{ foo: 1 }, { bar: 2 }]]) {
      expect(() => fromBackup(data)).toThrow(InvalidBackupError);
    }
  });

  it("limpa 'emprestado para' fora do status emprestado", () => {
    expect(
      fromBackup([{ title: "A", status: "lido", borrower: "Ana" }])[0].borrower
    ).toBeNull();
  });
});

describe("toBackup", () => {
  it("faz ida e volta preservando os dados", () => {
    const book = makeBook({
      orderNo: 4,
      title: "Torto arado",
      author: "Itamar Vieira Junior",
      pages: 264,
      yearPublished: 2019,
      acquiredOn: "2022-02-11",
      status: "emprestado",
      borrower: "Rafael",
      favorite: true,
      authorEthnicity: "Negra",
    });
    const out = toBackup([book]);
    expect(out[0]).toMatchObject({
      order: "4",
      pages: "264",
      year: "2019",
      acquired: "2022-02-11",
      fav: true,
      authorEthnicity: "Negra",
    });
    const back = fromBackup(out)[0];
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = book;
    expect(back).toEqual(fields);
  });
});

describe("conversões", () => {
  it("toPositiveInt", () => {
    expect(toPositiveInt("416")).toBe(416);
    expect(toPositiveInt("0")).toBeNull();
    expect(toPositiveInt("abc")).toBeNull();
    expect(toPositiveInt(3.5)).toBeNull();
  });
  it("toIsoDate", () => {
    expect(toIsoDate("2024-02-29")).toBe("2024-02-29");
    expect(toIsoDate("2023-02-29")).toBeNull();
    expect(toIsoDate("05/03/2024")).toBeNull();
  });
});
