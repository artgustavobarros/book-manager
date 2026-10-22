/**
 * Backup JSON compatível com o standalone ("Salvar backup" / "Restaurar backup").
 *
 * O standalone guardava tudo como string (`pages: "416"`, `year: "1949"`) com as
 * chaves `order`, `year`, `acquired`, `cover`, `fav`, `coverTried`. Aqui o backup é
 * convertido para os tipos do modelo, e o modelo é exportado de volta no mesmo formato.
 */

import { fromLegacyStatus, isReading, isSituation } from "./book-state";
import { withOrders } from "./orders";
import { clean } from "./text";
import {
  AUTHOR_GENDERS,
  type AuthorGender,
  BOOK_INT_MAX,
  type Book,
  type BookFields,
} from "./types";

export interface BackupBook {
  acquired: string;
  author: string;
  authorEthnicity: string;
  authorGender: string;
  borrower: string;
  cover: string;
  coverTried?: number;
  fav?: boolean;
  genre: string;
  id: string;
  /** Início do empréstimo (ISO), só em livros emprestados; o standalone não tem. */
  lentAt?: string;
  nationality: string;
  notes: string;
  order: string;
  pages: string;
  publisher: string;
  reading: string;
  situation: string;
  /** Status único dos backups antigos e do standalone; lido só quando faltam os dois acima. */
  status?: string;
  title: string;
  year: string;
  yearRead: string;
}

/** Livro restaurado: campos do modelo e, se o backup trouxer, o início do empréstimo. */
export type RestoredBook = BookFields & { lentAt?: string };

export class InvalidBackupError extends Error {
  constructor() {
    super("Arquivo inválido.");
    this.name = "InvalidBackupError";
  }
}

/**
 * Inteiro positivo a partir de string/número; qualquer outra coisa vira null.
 * Com `max`, valores acima do teto também viram null.
 */
export function toPositiveInt(
  v: unknown,
  max = Number.POSITIVE_INFINITY
): number | null {
  if (typeof v === "number") {
    return Number.isInteger(v) && v > 0 && v <= max ? v : null;
  }
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

/** Data YYYY-MM-DD válida ou null. */
export function toIsoDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return null;
  }
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s
    ? null
    : s;
}

export function toText(v: unknown): string | null {
  return typeof v === "string" || typeof v === "number"
    ? clean(String(v))
    : null;
}

export function toGender(v: unknown): AuthorGender | null {
  return AUTHOR_GENDERS.find((g) => g === v) ?? null;
}

/** Instante ISO válido e não futuro, ou undefined. */
export function toPastInstant(v: unknown, now: Date): string | undefined {
  if (typeof v !== "string" || !v.trim()) {
    return;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d > now ? undefined : d.toISOString();
}

/**
 * Converte um backup (deste app ou do standalone) em campos de livro prontos para gravar.
 * Entradas sem título são ignoradas; números acima de `BOOK_INT_MAX` são descartados e
 * nºs ausentes são atribuídos como em `withOrders`. O `lentAt` só é mantido em livro
 * emprestado e com instante válido; sem ele, quem grava usa o instante da restauração.
 * @throws InvalidBackupError se o conteúdo não for um array ou não tiver nenhum livro
 * com título (restaurar substitui o acervo, então um backup vazio apagaria tudo).
 */
export function fromBackup(
  data: unknown,
  now: Date = new Date()
): RestoredBook[] {
  if (!Array.isArray(data)) {
    throw new InvalidBackupError();
  }
  const books = data
    .filter(
      (b): b is Record<string, unknown> =>
        !!b &&
        typeof b === "object" &&
        !!toText((b as Record<string, unknown>).title)
    )
    .map((b): RestoredBook => {
      const fields = legacyToFields(b, now);
      const lentAt =
        fields.situation === "emprestado"
          ? toPastInstant(b.lentAt, now)
          : undefined;
      return lentAt ? { ...fields, lentAt } : fields;
    });
  if (!books.length) {
    throw new InvalidBackupError();
  }
  return withOrders(books);
}

/** Leitura e Situação do backup; sem elas, as do status único antigo. */
function state(b: Record<string, unknown>) {
  if (b.reading === undefined && b.situation === undefined) {
    return fromLegacyStatus(b.status, toPositiveInt(b.yearRead));
  }
  return {
    reading: isReading(b.reading) ? b.reading : "nao-lido",
    situation: isSituation(b.situation) ? b.situation : "em-casa",
  } as const;
}

/** Converte um livro no formato legado (strings) para os campos do modelo. */
export function legacyToFields(
  b: Record<string, unknown>,
  now: Date = new Date()
): BookFields {
  const { reading, situation } = state(b);
  return {
    orderNo: toPositiveInt(b.order ?? b.orderNo, BOOK_INT_MAX.orderNo),
    title: toText(b.title) ?? "",
    author: toText(b.author),
    authorGender: toGender(b.authorGender),
    authorEthnicity: toText(b.authorEthnicity),
    nationality: toText(b.nationality),
    publisher: toText(b.publisher),
    genre: toText(b.genre),
    yearPublished: toPositiveInt(
      b.year ?? b.yearPublished,
      BOOK_INT_MAX.yearPublished
    ),
    pages: toPositiveInt(b.pages, BOOK_INT_MAX.pages),
    acquiredOn: toIsoDate(b.acquired ?? b.acquiredOn),
    reading,
    situation,
    borrower: situation === "emprestado" ? toText(b.borrower) : null,
    yearRead: toPositiveInt(b.yearRead, BOOK_INT_MAX.yearRead),
    notes: toText(b.notes),
    coverUrl: toText(b.cover ?? b.coverUrl),
    favorite: b.fav === true || b.favorite === true,
    coverCheckedAt: b.coverTried || b.coverCheckedAt ? now.toISOString() : null,
  };
}

/** Chave legada (formato do standalone) → campo do modelo. */
export const LEGACY_FIELD = {
  order: "orderNo",
  title: "title",
  author: "author",
  nationality: "nationality",
  publisher: "publisher",
  year: "yearPublished",
  acquired: "acquiredOn",
  reading: "reading",
  situation: "situation",
  notes: "notes",
  cover: "coverUrl",
  pages: "pages",
  genre: "genre",
  yearRead: "yearRead",
  borrower: "borrower",
  authorGender: "authorGender",
  authorEthnicity: "authorEthnicity",
} as const satisfies Record<string, keyof BookFields>;

export type LegacyKey = keyof typeof LEGACY_FIELD;

const str = (v: string | number | null | undefined) =>
  v == null ? "" : String(v);

/** Exporta no formato do standalone (strings), acrescido de `authorEthnicity`. */
export function toBackup(books: readonly Book[]): BackupBook[] {
  return books.map((b) => ({
    id: b.id,
    order: str(b.orderNo),
    title: b.title,
    author: str(b.author),
    nationality: str(b.nationality),
    publisher: str(b.publisher),
    year: str(b.yearPublished),
    acquired: str(b.acquiredOn),
    reading: b.reading,
    situation: b.situation,
    notes: str(b.notes),
    cover: str(b.coverUrl),
    pages: str(b.pages),
    genre: str(b.genre),
    yearRead: str(b.yearRead),
    borrower: str(b.borrower),
    authorGender: str(b.authorGender),
    authorEthnicity: str(b.authorEthnicity),
    ...(b.favorite ? { fav: true } : {}),
    ...(b.coverCheckedAt ? { coverTried: 1 } : {}),
    ...(b.situation === "emprestado" && b.lentAt ? { lentAt: b.lentAt } : {}),
  }));
}
