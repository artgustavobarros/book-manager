import { describe, expect, it } from "vitest";

import type { Book } from "./types";
import {
  BOOK_SHEET_HEADERS,
  bookSheetRows,
  sheetWeekKey,
} from "./weekly-sheets";

const book: Book = {
  id: "book-1",
  orderNo: 1,
  title: "Livro",
  author: "Autora",
  authorGender: "Mulher",
  authorEthnicity: null,
  nationality: "Brasil",
  publisher: "Editora",
  genre: "Romance",
  yearPublished: 2024,
  pages: 120,
  acquiredOn: "2026-01-01",
  status: "lendo",
  borrower: null,
  yearRead: null,
  notes: '=IMPORTXML("url")',
  coverUrl: null,
  favorite: true,
  coverCheckedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("cópia semanal do acervo", () => {
  it("usa o ano ISO em UTC nas viradas de ano", () => {
    expect(sheetWeekKey(new Date("2021-01-01T23:59:59Z"))).toBe("2020-W53");
    expect(sheetWeekKey(new Date("2026-12-31T12:00:00Z"))).toBe("2026-W53");
    expect(sheetWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });

  it("exporta todos os campos do livro e mantém fórmulas como texto", () => {
    expect(Object.keys(BOOK_SHEET_HEADERS).sort()).toEqual(
      Object.keys(book).sort()
    );
    const [headers, values] = bookSheetRows([book]);
    expect(headers.values).toHaveLength(Object.keys(book).length);
    const keys = Object.keys(BOOK_SHEET_HEADERS) as (keyof Book)[];
    expect(values.values[keys.indexOf("notes")]).toEqual({
      userEnteredValue: { stringValue: book.notes },
    });
    expect(values.values[keys.indexOf("favorite")]).toEqual({
      userEnteredValue: { boolValue: true },
    });
    expect(values.values[keys.indexOf("pages")]).toEqual({
      userEnteredValue: { numberValue: 120 },
    });
  });

  it("exporta acervo vazio com somente o cabeçalho", () => {
    expect(bookSheetRows([])).toHaveLength(1);
  });
});
