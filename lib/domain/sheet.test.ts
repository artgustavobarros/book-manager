import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";
import { loadStandalone } from "@/tests/support/standalone";

import { legacyToFields, toText } from "./backup";
import {
  isGoogleSheetsUrl,
  mapDate,
  mapGender,
  mapHeader,
  mapStatus,
  mergeSheet,
  parseSheet,
  type SheetError,
  sheetCsvUrl,
} from "./sheet";
import type { Book, BookFields } from "./types";

const NOW = new Date("2026-06-15T18:00:00Z");

const CSV = [
  "Nº;TÍTULO;AUTOR(ES);EDITORA;STATUS;PAÍS;GÊNERO;GÊNERO;PÁGINAS;AQUISIÇÃO;EMPRESTADO;ANOTAÇÕES;ANO LIDO",
  "1;1984;George Orwell;Penguin;Lido;inglesa;Homem;Distopia;500;12/04/2023;;nota da planilha;2020",
  '"3";"Dom Casmurro";Machado de Assis;;Emprestado;brasileira;Homem;Romance;;;Carlos;;',
  "99;Livro Novo;Autora X;Todavia;não lido;chilena;Mulher;Contos;150;2025;;;",
  ";Outro Novo;Y;;;;;;;;;;",
  "2;Título diferente;Z;;sim;;ND;;;;;;",
  ";a metamorfose;franz kafka;Companhia;;;;;;;;;",
  ";;sem título;;;;;;;;;;",
].join("\r\n");

describe("sheetCsvUrl", () => {
  it("converte links de edição e publicação", () => {
    expect(
      sheetCsvUrl(
        "https://docs.google.com/spreadsheets/d/AbC-123_x/edit#gid=42"
      )
    ).toBe(
      "https://docs.google.com/spreadsheets/d/AbC-123_x/gviz/tq?tqx=out:csv&gid=42"
    );
    expect(
      sheetCsvUrl(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1/pubhtml?gid=7&single=true"
      )
    ).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1/pub?output=csv&gid=7"
    );
    expect(sheetCsvUrl("https://exemplo.com/planilha")).toBeNull();
    expect(sheetCsvUrl("  ")).toBeNull();
  });
  it("só permite buscar no Google Sheets", () => {
    expect(
      isGoogleSheetsUrl(
        "https://docs.google.com/spreadsheets/d/x/gviz/tq?tqx=out:csv"
      )
    ).toBe(true);
    expect(
      isGoogleSheetsUrl("https://docs.google.com.evil.com/spreadsheets/x")
    ).toBe(false);
    expect(isGoogleSheetsUrl("http://docs.google.com/spreadsheets/x")).toBe(
      false
    );
  });
});

describe("mapeamentos", () => {
  it("reconhece os cabeçalhos do standalone e Cor/etnia", () => {
    expect(mapHeader("TÍTULO")).toBe("title");
    expect(mapHeader("Gênero do autor")).toBe("authorGender");
    expect(mapHeader("Ano em que foi lido")).toBe("yearRead");
    expect(mapHeader("Ano")).toBe("year");
    expect(mapHeader("Cor/etnia do autor(a)")).toBe("authorEthnicity");
    expect(mapHeader("Raça")).toBe("authorEthnicity");
    expect(mapHeader("Decoração")).toBeNull();
    expect(mapHeader("#")).toBe("order");
  });
  it("normaliza status, datas e gênero", () => {
    expect(mapStatus("Não lido")).toBe("nao-lido");
    expect(mapStatus("SIM")).toBe("lido");
    expect(mapStatus("")).toBe("");
    expect(mapDate("5/3/2024")).toBe("2024-03-05");
    expect(mapDate("2019")).toBe("2019-01-01");
    expect(mapDate("ontem")).toBe("");
    expect(mapGender("Feminino")).toBe("Mulher");
    expect(mapGender("ND")).toBe("Não definido");
  });
});

describe("parseSheet", () => {
  it("detecta a coluna de gênero do autor e ignora linhas sem título", () => {
    const recs = parseSheet(CSV);
    expect(recs).toHaveLength(6);
    expect(recs[0]).toMatchObject({
      authorGender: "Homem",
      genre: "Distopia",
      acquired: "2023-04-12",
      status: "lido",
    });
  });
  it("rejeita HTML, planilha vazia e planilha sem título", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as SheetError).code;
      }
    };
    expect(code(() => parseSheet("<!DOCTYPE html><html>"))).toBe("html");
    expect(code(() => parseSheet("Título;Autor"))).toBe("empty");
    expect(code(() => parseSheet("Autor;Editora\nX;Y"))).toBe("no-title");
  });
});

describe("mergeSheet × standalone", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("produz o mesmo acervo final que o runSync() do standalone", async () => {
    const oracle = loadStandalone({
      state: { sheetUrl: "https://docs.google.com/spreadsheets/d/abc/edit" },
    });
    oracle.toast = () => {};
    vi.stubGlobal("fetch", async () => ({ ok: true, text: async () => CSV }));
    await (oracle as any).runSync();
    expect(oracle.state.syncMsg).toBe(
      "Sincronizado: 3 livros atualizados e 3 novos."
    );
    const theirs = oracle.state.books.map((b: any) => ({
      ...legacyToFields(b, NOW),
      borrower: toText(b.borrower),
    }));

    const books = referenceBooks();
    const merge = mergeSheet(books, parseSheet(CSV), NOW);
    expect([merge.updated, merge.added]).toEqual([3, 3]);
    const ours: BookFields[] = [
      ...books.map((b) => {
        const u = merge.updates.find((x) => x.id === b.id);
        const {
          id: _id,
          createdAt: _c,
          updatedAt: _u,
          lentAt: _l,
          ...fields
        } = { ...b, ...(u?.fields ?? {}) } as Book;
        return fields;
      }),
      ...merge.inserts,
    ];
    expect(ours).toEqual(theirs);
  });

  it("preserva anotações, capa, páginas e ano lido do app", () => {
    const book = makeBook({
      title: "A",
      author: "B",
      notes: "minha nota",
      pages: 100,
      yearRead: 2020,
      coverUrl: "https://c",
    });
    const merge = mergeSheet(
      [book],
      parseSheet(
        "Título;Autor;Anotações;Páginas;Ano lido;Capa;Editora\nA;B;outra;200;2021;https://d;Zahar"
      )
    );
    expect(merge.updates).toEqual([
      { id: book.id, fields: { publisher: "Zahar" } },
    ]);
  });

  it("grava Cor/etnia vinda da planilha", () => {
    const merge = mergeSheet([], parseSheet("Título;Cor/etnia\nA;Parda"));
    expect(merge.inserts[0]).toMatchObject({
      title: "A",
      authorEthnicity: "Parda",
      orderNo: 1,
      status: "nao-lido",
    });
  });
});
