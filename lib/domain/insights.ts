/** Seletores de "Dados do acervo" (porta de `dados()` do standalone). */
import { distinctCount, type Kpi } from "./dashboard";
import { groupKey, NOT_INFORMED } from "./shelf";
import { isRead, STATUS, type StatusInfo } from "./status";
import { cmp, nf } from "./text";
import type { Book } from "./types";

export type InsightScope = "todos" | "lidos";
export type BarField = "genre" | "nationality" | "publisher";

export interface BarItem {
  count: number;
  key: string;
  label: string;
  pct: string;
}

export interface Bars {
  badge: string;
  list: BarItem[];
  more: boolean;
  moreLabel: string;
  total: number;
}

export interface StatusSegment extends StatusInfo {
  bar: string;
  count: number;
  pct: string;
}

export interface YearColumn {
  count: number;
  current: boolean;
  pages: number;
  pct: string;
  sub: string;
  year: number;
}

export interface AssignRow {
  book: Book;
  years: { year: number; on: boolean }[];
}

export interface Insights {
  assignEmpty: boolean;
  assignMoreLabel: string;
  assignMoreShow: boolean;
  assignNoYearCount: number;
  assignReadCount: number;
  assignRows: AssignRow[];
  baseLabel: string;
  bigBooks: { book: Book; rank: number; pages: string }[];
  dataKpis: Kpi[];
  donutBg: string;
  donutTotal: string;
  genre: Bars;
  nat: Bars;
  pub: Bars;
  scopeCaption: string;
  statusSeg: StatusSegment[];
  thermoLabel: string;
  thermoPct: string;
  thermoPctLabel: string;
  yearBadge: string;
  yearCols: YearColumn[];
}

export interface InsightOptions {
  assignAll: boolean;
  assignMore: boolean;
  expanded: Partial<Record<BarField, boolean>>;
  scope: InsightScope;
  year: number;
}

const pg = (b: Book) => b.pages || 0;
const BAR_LIMIT = 7;
const ASSIGN_LIMIT = 6;

export function groupBy(
  books: readonly Book[],
  field: BarField
): { key: string; label: string; count: number }[] {
  const m = new Map<string, { key: string; label: string; count: number }>();
  for (const b of books) {
    const raw = (b[field] || "").trim();
    const key = groupKey(raw);
    const e = m.get(key) ?? { key, label: raw || NOT_INFORMED, count: 0 };
    e.count++;
    m.set(key, e);
  }
  return [...m.values()].sort(
    (a, b) => b.count - a.count || cmp(a.label, b.label)
  );
}

function bars(
  books: readonly Book[],
  field: BarField,
  unit: string,
  open: boolean
): Bars {
  const arr = groupBy(books, field);
  const max = Math.max(1, ...arr.map((e) => e.count));
  return {
    list: (open ? arr : arr.slice(0, BAR_LIMIT)).map((e) => ({
      ...e,
      pct: (e.count / max) * 100 + "%",
    })),
    total: arr.length,
    badge: arr.length + " " + unit,
    more: arr.length > BAR_LIMIT,
    moreLabel: open ? "Mostrar menos" : "Mostrar todos (" + arr.length + ")",
  };
}

export function insights(
  books: readonly Book[],
  opts: InsightOptions
): Insights {
  const { scope, expanded, assignAll, assignMore, year: Y } = opts;
  const read = books.filter(isRead);
  const base = scope === "lidos" ? read : books;
  const withP = books.filter((b) => pg(b) > 0);
  const readP = read.filter((b) => pg(b) > 0);
  const avg = withP.length
    ? withP.reduce((s, b) => s + pg(b), 0) / withP.length
    : 0;
  const shelfPages = withP.reduce((s, b) => s + pg(b), 0);
  const estFull = Math.round(shelfPages + (books.length - withP.length) * avg);
  const readPages = read.reduce((s, b) => s + pg(b), 0);
  const avgRead = readP.length ? Math.round(readPages / readP.length) : 0;
  const readPct = books.length
    ? Math.round((read.length / books.length) * 100)
    : 0;
  const readingN = books.filter((b) => b.status === "lendo").length;
  const missingP = books.length - withP.length;

  const dataKpis: Kpi[] = [
    {
      label: "Páginas lidas",
      value: nf(readPages),
      sub:
        "média de " +
        nf(avgRead) +
        " p. por livro lido · ~" +
        nf(estFull) +
        " p. para ler 100% do acervo",
    },
    {
      label: "Páginas na estante",
      value: nf(shelfPages),
      sub: missingP
        ? "~" +
          nf(estFull) +
          " estimadas, contando " +
          missingP +
          " livros sem nº de páginas"
        : "em " + nf(books.length) + " livros",
    },
    {
      label: "Leitura concluída",
      value: readPct + "%",
      sub: read.length + " lidos · " + readingN + " em leitura agora",
    },
    {
      label: "Diversidade literária",
      value: nf(distinctCount(books, "nationality")),
      sub:
        "países · " +
        distinctCount(books, "publisher") +
        " editoras · " +
        distinctCount(books, "genre") +
        " gêneros",
    },
  ];
  const thermo = estFull ? Math.min(100, (readPages / estFull) * 100) : 0;

  const counts = STATUS.map((s) => ({
    ...s,
    count: base.filter((b) => b.status === s.k).length,
  })).filter((s) => s.count);
  const bmax = Math.max(1, ...counts.map((s) => s.count));
  let acc = 0;
  const stops = counts.map((s) => {
    const a = acc;
    acc += (s.count / Math.max(1, base.length)) * 100;
    return s.dot + " " + a + "% " + acc + "%";
  });

  const years = new Map<number, { n: number; p: number }>();
  for (const b of read) {
    if (!b.yearRead) {
      continue;
    }
    const e = years.get(b.yearRead) ?? { n: 0, p: 0 };
    e.n++;
    e.p += pg(b);
    years.set(b.yearRead, e);
  }
  // O standalone ordena as chaves como string; anos têm 4 dígitos, então é equivalente.
  const ys = [...years.keys()].sort((a, b) => a - b).slice(-8);
  const ymax = Math.max(1, ...ys.map((y) => years.get(y)!.n));

  const noYear = read.filter((b) => !b.yearRead);
  const pool = assignAll
    ? [...read].sort((a, b) => cmp(a.title, b.title))
    : noYear;
  const lim = assignMore ? pool.length : ASSIGN_LIMIT;

  return {
    scopeCaption:
      scope === "lidos"
        ? "Gráficos calculados apenas com os " + read.length + " livros lidos"
        : "Gráficos calculados com todo o acervo (" + books.length + " livros)",
    dataKpis,
    thermoPct: thermo + "%",
    thermoPctLabel: Math.round(thermo) + "% lido",
    thermoLabel: nf(readPages) + " de ~" + nf(estFull) + " páginas do acervo",
    bigBooks: [...readP]
      .sort((a, b) => pg(b) - pg(a))
      .slice(0, 5)
      .map((book, i) => ({ book, rank: i + 1, pages: nf(pg(book)) + " p." })),
    baseLabel: nf(base.length) + " livros",
    donutTotal: nf(base.length),
    donutBg: stops.length
      ? "conic-gradient(" + stops.join(",") + ")"
      : "var(--soft)",
    statusSeg: counts.map((s) => ({
      ...s,
      bar: (s.count / bmax) * 100 + "%",
      pct: Math.round((s.count / Math.max(1, base.length)) * 100) + "%",
    })),
    genre: bars(base, "genre", "gêneros", !!expanded.genre),
    nat: bars(base, "nationality", "países", !!expanded.nationality),
    pub: bars(base, "publisher", "editoras", !!expanded.publisher),
    yearCols: ys.map((y) => {
      const e = years.get(y)!;
      return {
        year: y,
        count: e.n,
        pages: e.p,
        sub: nf(e.p) + " páginas",
        pct: (e.n / ymax) * 82 + "%",
        current: y === Y,
      };
    }),
    yearBadge: ys.length
      ? nf(ys.reduce((s, y) => s + years.get(y)!.p, 0)) + " páginas"
      : "",
    assignNoYearCount: noYear.length,
    assignReadCount: read.length,
    assignRows: pool.slice(0, lim).map((book) => ({
      book,
      years: [Y - 4, Y - 3, Y - 2, Y - 1, Y].map((year) => ({
        year,
        on: book.yearRead === year,
      })),
    })),
    assignEmpty: pool.length === 0,
    assignMoreShow: pool.length > ASSIGN_LIMIT,
    assignMoreLabel: assignMore
      ? "Mostrar menos"
      : "Mostrar todos (" + pool.length + ")",
  };
}
