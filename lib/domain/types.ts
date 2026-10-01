/** Modelo de domínio compartilhado entre cliente e servidor (sem dependências de banco). */

export const BOOK_STATUSES = ["nao-lido", "lendo", "lido", "emprestado", "abandonado", "doado"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const AUTHOR_GENDERS = ["Homem", "Mulher", "Não definido"] as const;
export type AuthorGender = (typeof AUTHOR_GENDERS)[number];

export interface Book {
  id: string;
  orderNo: number | null;
  title: string;
  author: string | null;
  authorGender: AuthorGender | null;
  authorEthnicity: string | null;
  nationality: string | null;
  publisher: string | null;
  genre: string | null;
  yearPublished: number | null;
  pages: number | null;
  /** Data no formato YYYY-MM-DD. */
  acquiredOn: string | null;
  status: BookStatus;
  borrower: string | null;
  yearRead: number | null;
  notes: string | null;
  coverUrl: string | null;
  favorite: boolean;
  /** ISO timestamp da última busca automática de capa ("coverTried" no standalone). */
  coverCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Campos editáveis de um livro (tudo menos id, dono e carimbos de data). */
export type BookFields = Omit<Book, "id" | "createdAt" | "updatedAt">;

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
