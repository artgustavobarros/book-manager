/** Estado do livro em duas dimensões independentes: Leitura e Situação (ADR 0001). */
import type { Book, Reading, Situation } from "./types";

export interface StateInfo<K extends string> {
  /** Cor do ponto (token CSS do design). */
  dot: string;
  k: K;
  label: string;
  /** Plural usado nos chips da Estante. */
  plural: string;
}

export const READINGS: readonly StateInfo<Reading>[] = [
  {
    k: "nao-lido",
    label: "Não lido",
    plural: "Não lidos",
    dot: "var(--status-nao-lido)",
  },
  { k: "lendo", label: "Lendo", plural: "Lendo", dot: "var(--status-lendo)" },
  { k: "lido", label: "Lido", plural: "Lidos", dot: "var(--status-lido)" },
  {
    k: "abandonado",
    label: "Abandonado",
    plural: "Abandonados",
    dot: "var(--status-abandonado)",
  },
];

export const SITUATIONS: readonly StateInfo<Situation>[] = [
  {
    k: "em-casa",
    label: "Em casa",
    plural: "Em casa",
    dot: "var(--status-em-casa)",
  },
  {
    k: "emprestado",
    label: "Emprestado",
    plural: "Emprestados",
    dot: "var(--status-emprestado)",
  },
  { k: "doado", label: "Doado", plural: "Doados", dot: "var(--status-doado)" },
];

export function readingInfo(k: string | null | undefined): StateInfo<Reading> {
  return READINGS.find((s) => s.k === k) ?? READINGS[0];
}

export function situationInfo(
  k: string | null | undefined
): StateInfo<Situation> {
  return SITUATIONS.find((s) => s.k === k) ?? SITUATIONS[0];
}

export function isReading(k: unknown): k is Reading {
  return READINGS.some((s) => s.k === k);
}

export function isSituation(k: unknown): k is Situation {
  return SITUATIONS.some((s) => s.k === k);
}

/**
 * Cicla a Leitura para a próxima etapa:
 * nao-lido -> lendo -> lido -> nao-lido (abandonado volta para nao-lido)
 */
export function nextReading(current: Reading): Reading {
  if (current === "nao-lido") {
    return "lendo";
  }
  if (current === "lendo") {
    return "lido";
  }
  return "nao-lido";
}

/** Livro lido para as contagens (meta anual, Lidos, Dados), qualquer que seja a Situação. */
export function isRead(book: Pick<Book, "reading">): boolean {
  return book.reading === "lido";
}

/** Ano de leitura ao trocar a Leitura, usado pela ficha e pelas ações rápidas. */
export function readingYearFor<Year extends string | number>(
  current: Year | null,
  reading: Reading,
  year: Year
): Year | null {
  if (reading === "nao-lido") {
    return null;
  }
  if (reading === "lido" && !current) {
    return year;
  }
  return current;
}

/**
 * Leitura e Situação a partir do status único antigo (backups e planilhas antigas).
 * Emprestado e Doado viram Situação; a Leitura deles é Lido se há ano de leitura
 * e Não lido se não há, como na migração do banco (ADR 0001).
 */
export function fromLegacyStatus(
  status: unknown,
  yearRead: unknown
): { reading: Reading; situation: Situation } {
  if (status === "emprestado" || status === "doado") {
    return { reading: yearRead ? "lido" : "nao-lido", situation: status };
  }
  return {
    reading: isReading(status) ? status : "nao-lido",
    situation: "em-casa",
  };
}
