import { fromBackup } from "@/lib/domain/backup";
import type { Book } from "@/lib/domain/types";

import raw from "../fixtures/reference-books.json";

/** Acervo de referência (SEED do standalone) convertido para o modelo, com os ids originais. */
export function referenceBooks(): Book[] {
  const fields = fromBackup(raw, new Date("2026-06-15T12:00:00Z"));
  return fields.map((f, i) => ({
    ...f,
    id: raw[i].id,
    lentAt:
      f.lentAt ??
      (f.status === "emprestado" ? "2026-01-01T00:00:00.000Z" : null),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
}

let seq = 0;
/** Livro de teste com valores padrão. */
export function makeBook(overrides: Partial<Book> = {}): Book {
  seq += 1;
  return {
    id: `t${seq}`,
    orderNo: null,
    title: `Livro ${seq}`,
    author: null,
    authorGender: null,
    authorEthnicity: null,
    nationality: null,
    publisher: null,
    genre: null,
    yearPublished: null,
    pages: null,
    acquiredOn: null,
    status: "nao-lido",
    borrower: null,
    lentAt: null,
    yearRead: null,
    notes: null,
    coverUrl: null,
    favorite: false,
    coverCheckedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
