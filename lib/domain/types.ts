/** Modelo de domínio compartilhado entre cliente e servidor (sem dependências de banco). */

/** Leitura: o que a pessoa fez com o livro como leitora. */
export const BOOK_READINGS = [
  "nao-lido",
  "lendo",
  "lido",
  "abandonado",
] as const;
export type Reading = (typeof BOOK_READINGS)[number];

/** Situação: onde o livro está em relação à casa da pessoa. */
export const BOOK_SITUATIONS = ["em-casa", "emprestado", "doado"] as const;
export type Situation = (typeof BOOK_SITUATIONS)[number];

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
  /** ISO timestamp do início do empréstimo atual; só o servidor grava, null fora de Emprestado. */
  lentAt: string | null;
  nationality: string | null;
  notes: string | null;
  orderNo: number | null;
  pages: number | null;
  publisher: string | null;
  reading: Reading;
  situation: Situation;
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
  reading: "nao-lido",
  situation: "em-casa",
  borrower: null,
  yearRead: null,
  notes: null,
  coverUrl: null,
  favorite: false,
  coverCheckedAt: null,
};

/**
 * Livro na estante pública: só os campos que o dono aceita mostrar a visitantes.
 * Tipo próprio (sem herdar de `Book`) para que nada privado passe por engano: a Situação
 * (inclusive Emprestado) nunca é pública.
 */
export interface PublicBook {
  author: string | null;
  coverUrl: string | null;
  genre: string | null;
  id: string;
  pages: number | null;
  publisher: string | null;
  reading: Reading;
  title: string;
  yearPublished: number | null;
}

/** Dono da estante pública, como os visitantes o veem. */
export interface PublicOwner {
  image: string | null;
  name: string;
}
