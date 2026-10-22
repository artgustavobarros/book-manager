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
      reading: "lido",
      situation: "em-casa",
      authorGender: "Homem",
      favorite: false,
      notes: null,
      coverUrl: null,
    });
    const lent = books.find((x) => x.title === "Dom Casmurro")!;
    expect(lent).toMatchObject({
      reading: "nao-lido",
      situation: "emprestado",
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
      reading: "nao-lido",
      situation: "em-casa",
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

  it("descarta números acima dos limites do modelo", () => {
    const [b] = fromBackup([
      {
        title: "Fora da faixa",
        order: "99999999999",
        pages: "99999999999",
        year: "99999",
        yearRead: 10_000,
        author: "Fulana",
      },
    ]);
    expect(b).toMatchObject({
      title: "Fora da faixa",
      author: "Fulana",
      orderNo: 1,
      pages: null,
      yearPublished: null,
      yearRead: null,
    });
  });
  it("limpa 'emprestado para' fora de Emprestado", () => {
    const [legacy, current] = fromBackup([
      { title: "A", status: "lido", borrower: "Ana" },
      { title: "B", reading: "lido", situation: "em-casa", borrower: "Ana" },
    ]);
    expect(legacy.borrower).toBeNull();
    expect(current.borrower).toBeNull();
  });

  it("separa o status único dos backups antigos em Leitura e Situação", () => {
    const books = fromBackup([
      { title: "A", status: "emprestado", yearRead: "2021", borrower: "Ana" },
      { title: "B", status: "doado" },
      { title: "C", status: "abandonado" },
    ]);
    expect(
      books.map(({ reading, situation, borrower }) => ({
        reading,
        situation,
        borrower,
      }))
    ).toEqual([
      { reading: "lido", situation: "emprestado", borrower: "Ana" },
      { reading: "nao-lido", situation: "doado", borrower: null },
      { reading: "abandonado", situation: "em-casa", borrower: null },
    ]);
  });

  it("lê Leitura e Situação do backup novo, com padrão para valor inválido", () => {
    const [a, b] = fromBackup([
      { title: "A", reading: "lendo", situation: "emprestado", status: "lido" },
      { title: "B", reading: "xyz", situation: "xyz" },
    ]);
    expect(a).toMatchObject({ reading: "lendo", situation: "emprestado" });
    expect(b).toMatchObject({ reading: "nao-lido", situation: "em-casa" });
  });

  it("mantém o início do empréstimo só se válido, passado e em livro emprestado", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const [ok, legacy, invalid, future, notLent] = fromBackup(
      [
        { title: "A", status: "emprestado", lentAt: "2026-05-26T15:00:00Z" },
        { title: "B", status: "emprestado" },
        { title: "C", status: "emprestado", lentAt: "ontem" },
        { title: "D", status: "emprestado", lentAt: "2026-07-01T00:00:00Z" },
        { title: "E", status: "lido", lentAt: "2026-05-26T15:00:00Z" },
      ],
      now
    );
    expect(ok.lentAt).toBe("2026-05-26T15:00:00.000Z");
    for (const b of [legacy, invalid, future, notLent]) {
      expect(b).not.toHaveProperty("lentAt");
    }
  });

  it("mantém o início do empréstimo no backup novo", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const [lent, home] = fromBackup(
      [
        {
          title: "A",
          reading: "lido",
          situation: "emprestado",
          lentAt: "2026-05-26T15:00:00Z",
        },
        {
          title: "B",
          reading: "lido",
          situation: "em-casa",
          lentAt: "2026-05-26T15:00:00Z",
        },
      ],
      now
    );
    expect(lent.lentAt).toBe("2026-05-26T15:00:00.000Z");
    expect(home).not.toHaveProperty("lentAt");
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
      reading: "lendo",
      situation: "emprestado",
      borrower: "Rafael",
      lentAt: "2026-05-26T15:00:00.000Z",
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
      reading: "lendo",
      situation: "emprestado",
      lentAt: "2026-05-26T15:00:00.000Z",
    });
    expect(out[0]).not.toHaveProperty("status");
    const back = fromBackup(out)[0];
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = book;
    expect(back).toEqual(fields);
  });

  it("só exporta o início do empréstimo de livros emprestados", () => {
    const [returned, lentWithout] = toBackup([
      makeBook({ reading: "lido", lentAt: "2026-05-26T15:00:00.000Z" }),
      makeBook({ situation: "emprestado", borrower: "Ana", lentAt: null }),
    ]);
    expect(returned).not.toHaveProperty("lentAt");
    expect(lentWithout).not.toHaveProperty("lentAt");
  });
});

describe("conversões", () => {
  it("toPositiveInt", () => {
    expect(toPositiveInt("416")).toBe(416);
    expect(toPositiveInt("0")).toBeNull();
    expect(toPositiveInt("abc")).toBeNull();
    expect(toPositiveInt(3.5)).toBeNull();
    expect(toPositiveInt("99999999999")).toBe(99_999_999_999);
    expect(toPositiveInt("100000", 100_000)).toBe(100_000);
    expect(toPositiveInt("100001", 100_000)).toBeNull();
    expect(toPositiveInt(100_001, 100_000)).toBeNull();
  });
  it("toIsoDate", () => {
    expect(toIsoDate("2024-02-29")).toBe("2024-02-29");
    expect(toIsoDate("2023-02-29")).toBeNull();
    expect(toIsoDate("05/03/2024")).toBeNull();
  });
});
