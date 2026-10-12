import type { Book, BookStatus } from "./types";

export interface StatusInfo {
  /** Cor do ponto (token CSS do design). */
  dot: string;
  k: BookStatus;
  label: string;
  /** Plural usado nos chips da Estante. */
  plural: string;
}

export const STATUS: readonly StatusInfo[] = [
  {
    k: "nao-lido",
    label: "Não lido",
    plural: "Não lidos",
    dot: "var(--status-nao-lido)",
  },
  { k: "lendo", label: "Lendo", plural: "Lendo", dot: "var(--status-lendo)" },
  { k: "lido", label: "Lido", plural: "Lidos", dot: "var(--status-lido)" },
  {
    k: "emprestado",
    label: "Emprestado",
    plural: "Emprestados",
    dot: "var(--status-emprestado)",
  },
  {
    k: "abandonado",
    label: "Abandonado",
    plural: "Abandonados",
    dot: "var(--status-abandonado)",
  },
  { k: "doado", label: "Doado", plural: "Doados", dot: "var(--status-doado)" },
];

export function stat(k: string | null | undefined): StatusInfo {
  return STATUS.find((s) => s.k === k) ?? STATUS[0];
}

export function isBookStatus(k: unknown): k is BookStatus {
  return STATUS.some((s) => s.k === k);
}

/**
 * Cicla o status de leitura para a próxima etapa:
 * nao-lido -> lendo -> lido -> nao-lido
 * (outros status retornam para nao-lido)
 */
export function nextReadingStatus(current: BookStatus): BookStatus {
  if (current === "nao-lido") {
    return "lendo";
  }
  if (current === "lendo") {
    return "lido";
  }
  return "nao-lido";
}

/**
 * Livro lido para as contagens (meta anual, Lidos, Dados): status "lido", ou emprestado
 * com ano de leitura, que é um livro lido que está fora de casa.
 */
export function isRead(book: Pick<Book, "status" | "yearRead">): boolean {
  return (
    book.status === "lido" || (book.status === "emprestado" && !!book.yearRead)
  );
}

/** Status de um livro emprestado ao ser devolvido: "lido" se tem ano de leitura. */
export function returnStatus(book: Pick<Book, "yearRead">): BookStatus {
  return book.yearRead ? "lido" : "nao-lido";
}
