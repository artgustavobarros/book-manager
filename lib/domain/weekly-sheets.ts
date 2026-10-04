import type { Book } from "./types";

/** ISO week in UTC. The year is the week-year, not necessarily the calendar year. */
export function sheetWeekKey(date: Date): string {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const week =
    1 +
    Math.round(
      (day.getTime() -
        firstThursday.getTime() -
        (4 - (firstThursday.getUTCDay() || 7)) * 86_400_000) /
        604_800_000
    );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export const BOOK_SHEET_HEADERS: Record<keyof Book, string> = {
  id: "ID",
  orderNo: "Ordem",
  title: "Título",
  author: "Autor(a)",
  authorGender: "Gênero do autor(a)",
  authorEthnicity: "Cor/etnia do autor(a)",
  nationality: "Nacionalidade",
  publisher: "Editora",
  genre: "Gênero da obra",
  yearPublished: "Ano de lançamento",
  pages: "Páginas",
  acquiredOn: "Data de aquisição (ISO)",
  status: "Status",
  borrower: "Emprestado para",
  yearRead: "Ano em que foi lido",
  notes: "Anotações",
  coverUrl: "Capa",
  favorite: "Favorito",
  coverCheckedAt: "Última busca de capa",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
};

export type SheetCell = {
  userEnteredValue: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
  };
};
export type SheetRow = { values: SheetCell[] };

function cell(value: string | number | boolean | null): SheetCell {
  if (typeof value === "boolean") {
    return { userEnteredValue: { boolValue: value } };
  }
  if (typeof value === "number") {
    return { userEnteredValue: { numberValue: value } };
  }
  // stringValue prevents spreadsheet formula execution, including for leading '='.
  return { userEnteredValue: { stringValue: value ?? "" } };
}

export function bookSheetRows(books: readonly Book[]): SheetRow[] {
  const keys = Object.keys(BOOK_SHEET_HEADERS) as (keyof Book)[];
  return [
    { values: keys.map((key) => cell(BOOK_SHEET_HEADERS[key])) },
    ...books.map((book) => ({ values: keys.map((key) => cell(book[key])) })),
  ];
}
