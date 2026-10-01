import type { BookStatus } from "./types";

export interface StatusInfo {
  k: BookStatus;
  label: string;
  /** Plural usado nos chips da Estante. */
  plural: string;
  /** Cor do ponto (token CSS do design). */
  dot: string;
}

export const STATUS: readonly StatusInfo[] = [
  { k: "nao-lido", label: "Não lido", plural: "Não lidos", dot: "var(--status-nao-lido)" },
  { k: "lendo", label: "Lendo", plural: "Lendo", dot: "var(--status-lendo)" },
  { k: "lido", label: "Lido", plural: "Lidos", dot: "var(--status-lido)" },
  { k: "emprestado", label: "Emprestado", plural: "Emprestados", dot: "var(--status-emprestado)" },
  { k: "abandonado", label: "Abandonado", plural: "Abandonados", dot: "var(--status-abandonado)" },
  { k: "doado", label: "Doado", plural: "Doados", dot: "var(--status-doado)" },
];

export function stat(k: string | null | undefined): StatusInfo {
  return STATUS.find((s) => s.k === k) ?? STATUS[0];
}

export function isBookStatus(k: unknown): k is BookStatus {
  return STATUS.some((s) => s.k === k);
}
