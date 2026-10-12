/** Modelo de domínio compartilhado entre cliente e servidor (sem dependências de banco). */

export const BOOK_STATUSES = [
  "nao-lido",
  "lendo",
  "lido",
  "emprestado",
  "abandonado",
  "doado",
] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const AUTHOR_GENDERS = ["Homem", "Mulher", "Não definido"] as const;
export type AuthorGender = (typeof AUTHOR_GENDERS)[number];

/** Teto dos campos inteiros do livro (formulário, API e restauração de backup). */
export const BOOK_INT_MAX = {
  orderNo: 1_000_000,
  yearPublished: 9999,
  pages: 100_000,
  yearRead: 9999,
} as const;

export interface Book {
  /** Data no formato YYYY-MM-DD. */
  acquiredOn: string | null;
  author: string | null;
  authorEthnicity: string | null;
  authorGender: AuthorGender | null;
  borrower: string | null;
  /** ISO timestamp da última busca automática de capa ("coverTried" no standalone). */
  coverCheckedAt: string | null;
  coverUrl: string | null;
  createdAt: string;
  favorite: boolean;
  genre: string | null;
  id: string;
  /** ISO timestamp do início do empréstimo atual; só o servidor grava, null fora de "emprestado". */
  lentAt: string | null;
  nationality: string | null;
  notes: string | null;
  orderNo: number | null;
  pages: number | null;
  publisher: string | null;
  status: BookStatus;
  title: string;
  updatedAt: string;
  yearPublished: number | null;
  yearRead: number | null;
}

/** Campos editáveis de um livro (tudo menos id, dono e carimbos de data). */
export type BookFields = Omit<
  Book,
  "id" | "createdAt" | "updatedAt" | "lentAt"
>;

export const EMPTY_BOOK_FIELDS: BookFields = {
  orderNo: null,
  title: "",
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
  yearRead: null,
  notes: null,
  coverUrl: null,
  favorite: false,
  coverCheckedAt: null,
};
