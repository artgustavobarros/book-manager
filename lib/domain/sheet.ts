/**
 * Sincronização com Google Sheets (porta de `sheetCsvUrl`, `mapHeader`, `mapStatus`,
 * `mapDate`, `mapGender` e do merge de `runSync()` do standalone).
 *
 * O merge roda sobre a representação legada (strings), exatamente como no standalone,
 * e só o resultado é convertido para os tipos do modelo.
 */
import {
  LEGACY_FIELD,
  type LegacyKey,
  legacyToFields,
  toBackup,
  toGender,
  toIsoDate,
  toPositiveInt,
  toText,
} from "./backup";
import { parseCSV } from "./csv";
import { isBookStatus } from "./status";
import { norm } from "./text";
import type { Book, BookFields } from "./types";

export type SheetErrorCode =
  | "invalid-url"
  | "html"
  | "empty"
  | "no-title"
  | "fetch";

export class SheetError extends Error {
  constructor(public code: SheetErrorCode) {
    super(code);
    this.name = "SheetError";
  }
}

/** Link de compartilhamento/publicação → URL que devolve CSV (mantendo o `gid`). */
export function sheetCsvUrl(input: string | null | undefined): string | null {
  const u = String(input || "").trim();
  if (!u) {
    return null;
  }
  if (/output=csv|format=csv|tqx=out:csv/.test(u)) {
    return u;
  }
  const g = (u.match(/[#&?]gid=(\d+)/) || [])[1];
  if (u.includes("/d/e/")) {
    return u.replace(
      /\/pub(html)?.*$/,
      "/pub?output=csv" + (g ? "&gid=" + g : "")
    );
  }
  const m = u.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) {
    return null;
  }
  return (
    "https://docs.google.com/spreadsheets/d/" +
    m[1] +
    "/gviz/tq?tqx=out:csv" +
    (g ? "&gid=" + g : "")
  );
}

/** Só aceita URLs do Google Sheets (o servidor não deve buscar URLs arbitrárias). */
export function isGoogleSheetsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "docs.google.com" &&
      u.pathname.startsWith("/spreadsheets/")
    );
  } catch {
    return false;
  }
}

export function mapHeader(h: string): LegacyKey | null {
  const n = norm(h);
  if (!n) {
    return null;
  }
  if (n.includes("emprest")) {
    return "borrower";
  }
  // Novo em relação ao standalone: coluna Cor/etnia do autor(a).
  if (/\b(cor|etnia|raca)\b/.test(n)) {
    return "authorEthnicity";
  }
  if (n.includes("genero") && n.includes("autor")) {
    return "authorGender";
  }
  if (n.includes("genero") || n === "tipo" || n.includes("categoria")) {
    return "genre";
  }
  if (n.includes("pagina")) {
    return "pages";
  }
  if (n.includes("ano") && (n.includes("lido") || n.includes("leitura"))) {
    return "yearRead";
  }
  if (n.includes("lancamento") || n.includes("publicacao") || n === "ano") {
    return "year";
  }
  if (n.includes("aquisi") || n.includes("compra") || n.includes("adquiri")) {
    return "acquired";
  }
  if (n.includes("nacional") || n.includes("pais")) {
    return "nationality";
  }
  if (n.includes("editora")) {
    return "publisher";
  }
  if (n.includes("titulo") || n === "livro" || n === "obra") {
    return "title";
  }
  if (n.includes("autor")) {
    return "author";
  }
  if (n.includes("status") || n.includes("situa")) {
    return "status";
  }
  if (n.includes("capa") || n.includes("imagem")) {
    return "cover";
  }
  if (
    n.includes("anota") ||
    n.includes("nota") ||
    n.includes("observ") ||
    n.includes("coment")
  ) {
    return "notes";
  }
  if (
    n === "#" ||
    n === "n" ||
    n === "no" ||
    n.includes("ordem") ||
    n.includes("numero")
  ) {
    return "order";
  }
  return null;
}

export function mapStatus(v: string): string {
  const n = norm(v);
  if (!n) {
    return "";
  }
  if (n.startsWith("nao")) {
    return "nao-lido";
  }
  if (n.includes("lendo")) {
    return "lendo";
  }
  if (n.includes("emprest")) {
    return "emprestado";
  }
  if (n.includes("abandon")) {
    return "abandonado";
  }
  if (n.includes("doad")) {
    return "doado";
  }
  if (n.includes("lido") || n === "sim") {
    return "lido";
  }
  return "nao-lido";
}

export function mapDate(input: string): string {
  const v = String(input || "").trim();
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
    return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  }
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    return m[0];
  }
  if ((m = v.match(/^(\d{4})$/))) {
    return m[1] + "-01-01";
  }
  return "";
}

export function mapGender(v: string): string {
  const n = norm(v);
  if (!n) {
    return "";
  }
  if (n.startsWith("mulher") || n.startsWith("fem") || n === "f") {
    return "Mulher";
  }
  if (n.startsWith("homem") || n.startsWith("masc") || n === "m") {
    return "Homem";
  }
  return "Não definido";
}

export type SheetRecord = Partial<Record<LegacyKey, string>>;

const GENDER_VALUES =
  /^(homem|mulher|nd|n\/d|nao definido|nao binario.*|masculino|feminino|m|f|nb)$/;

/** Lê o CSV da planilha e devolve os registros já normalizados (status, datas, gênero, números). */
export function parseSheet(text: string): SheetRecord[] {
  if (/^\s*</.test(text)) {
    throw new SheetError("html");
  }
  const rows = parseCSV(text);
  if (rows.length < 2) {
    throw new SheetError("empty");
  }
  const map = rows[0].map(mapHeader);
  map.forEach((k, i) => {
    if (k !== "genre") {
      return;
    }
    const vals = rows
      .slice(1)
      .map((r) => norm(r[i]))
      .filter(Boolean);
    if (
      vals.length &&
      vals.filter((v) => GENDER_VALUES.test(v)).length / vals.length >= 0.7
    ) {
      map[i] = "authorGender";
    } else if (!vals.length && map.filter((x) => x === "genre").length > 1) {
      map[i] = null;
    }
  });
  if (!map.includes("title")) {
    throw new SheetError("no-title");
  }
  return rows
    .slice(1)
    .map((r) => {
      const o: SheetRecord = {};
      map.forEach((k, i) => {
        if (k && o[k] === undefined) {
          o[k] = (r[i] || "").trim();
        }
      });
      if (o.status !== undefined) {
        o.status = mapStatus(o.status);
      }
      if (o.acquired !== undefined) {
        o.acquired = mapDate(o.acquired);
      }
      if (o.authorGender !== undefined) {
        o.authorGender = mapGender(o.authorGender);
      }
      if (o.order !== undefined) {
        o.order = String(Number.parseInt(o.order, 10) || "");
      }
      if (o.yearRead) {
        o.yearRead = String(Number.parseInt(o.yearRead, 10) || "");
      }
      if (o.pages) {
        o.pages = String(Number.parseInt(o.pages, 10) || "");
      }
      return o;
    })
    .filter((o) => o.title);
}

/** Converte um único campo legado para o valor do modelo. */
function legacyValue(key: LegacyKey, v: unknown): BookFields[keyof BookFields] {
  switch (key) {
    case "order":
    case "year":
    case "pages":
    case "yearRead":
      return toPositiveInt(v);
    case "acquired":
      return toIsoDate(v);
    case "status":
      return isBookStatus(v) ? v : "nao-lido";
    case "authorGender":
      return toGender(v);
    case "title":
      return toText(v) ?? "";
    default:
      return toText(v);
  }
}

export interface SheetMerge {
  added: number;
  inserts: BookFields[];
  updated: number;
  updates: { id: string; fields: Partial<BookFields> }[];
}

type Legacy = Record<string, unknown> & {
  id: string;
  order: string;
  title: string;
  author: string;
};

/** Aplica os registros da planilha ao acervo (mesmas regras do standalone). */
export function mergeSheet(
  books: readonly Book[],
  recs: readonly SheetRecord[],
  now: Date = new Date()
): SheetMerge {
  const legacy = toBackup(books) as unknown as Legacy[];
  const key = (b: { title?: unknown; author?: unknown }) =>
    norm(b.title) + "|" + norm(b.author);
  const byOrder: Record<string, Legacy> = {};
  const byKey: Record<string, Legacy> = {};
  legacy.forEach((b) => {
    if (b.order) {
      byOrder[b.order] = b;
    }
    byKey[key(b)] = b;
  });
  const changed: Record<string, Legacy> = {};
  const added: Record<string, unknown>[] = [];
  let max = Math.max(
    0,
    ...legacy.map((b) => Number.parseInt(b.order, 10) || 0)
  );
  let upd = 0;

  for (const r of recs) {
    const m =
      (r.order &&
      byOrder[r.order] &&
      norm(byOrder[r.order].title) === norm(r.title)
        ? byOrder[r.order]
        : null) || byKey[key(r)];
    if (m) {
      const x: Legacy = { ...(changed[m.id] || m) };
      (Object.keys(r) as LegacyKey[]).forEach((k) => {
        if (r[k] !== "" && r[k] !== undefined) {
          x[k] = r[k];
        }
      });
      (["notes", "cover", "pages", "yearRead"] as const).forEach((k) => {
        if (m[k]) {
          x[k] = m[k];
        }
      });
      // Fora do status "emprestado" não há com quem o livro esteja.
      if (x.status !== "emprestado") {
        x.borrower = "";
      }
      changed[m.id] = x;
      upd++;
    } else {
      const o = r.order && !byOrder[r.order] ? r.order : String(++max);
      max = Math.max(max, Number.parseInt(o, 10) || 0);
      const nonEmpty = Object.fromEntries(
        Object.entries(r).filter(([, v]) => v !== "")
      );
      added.push({ ...nonEmpty, order: o, status: r.status || "nao-lido" });
    }
  }

  const updates = Object.values(changed).flatMap((x) => {
    const before = legacy.find((b) => b.id === x.id)!;
    const fields: Partial<BookFields> = {};
    (Object.keys(LEGACY_FIELD) as LegacyKey[]).forEach((k) => {
      if ((x[k] ?? "") !== (before[k] ?? "")) {
        (fields as Record<string, unknown>)[LEGACY_FIELD[k]] = legacyValue(
          k,
          x[k]
        );
      }
    });
    return Object.keys(fields).length ? [{ id: x.id, fields }] : [];
  });

  return {
    updates,
    // `legacyToFields` só guarda quem pegou emprestado nos livros emprestados.
    inserts: added.map((a) => legacyToFields(a, now)),
    updated: upd,
    added: added.length,
  };
}
