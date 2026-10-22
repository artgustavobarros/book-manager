/** Seletores de "Dados" (porta de `dados()` do standalone). */

import { isRead, READINGS, SITUATIONS, type StateInfo } from "./book-state";
import { distinctCount, type Kpi } from "./dashboard";
import { groupKey, NOT_INFORMED, type ReadingFilter } from "./shelf";
import { cmp, nf } from "./text";
import type { Book, Reading, Situation } from "./types";

export type InsightScope = "todos" | "lidos";
export type BarField = "genre" | "nationality" | "publisher";

/** Leitura da Estante que mostra os mesmos livros contados no escopo dos gráficos. */
export function scopeShelfReading(scope: InsightScope): ReadingFilter {
  return scope === "lidos" ? "lido" : "todos";
}

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

export interface StateSegment<K extends string> extends StateInfo<K> {
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
  readingSeg: StateSegment<Reading>[];
  situationSeg: StateSegment<Situation>[];
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

const NONE = "—";
const dec1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function orNone(n: number, sub: string, empty: string) {
  return n ? { value: nf(n), sub } : { value: NONE, sub: empty };
}

function shelfKpi(total: number, withPages: number, pages: number): Kpi {
  const label = "Páginas na estante";
  if (!withPages) {
    return { label, value: NONE, sub: "nenhum livro com páginas informadas" };
  }
  let sub = "somando " + nf(withPages) + " de " + nf(total) + " livros";
  if (withPages === total) {
    sub =
      total === 1 ? "somando 1 livro" : "somando os " + nf(total) + " livros";
  }
  return { label, value: nf(pages), sub };
}

function topGenreKpi(read: readonly Book[]): Kpi {
  const label = "Gênero mais lido";
  if (!read.length) {
    return { label, value: NONE, sub: "nenhum livro lido ainda" };
  }
  // groupBy já ordena por contagem e, no empate, pelo rótulo.
  const top = groupBy(read, "genre").find((e) => e.key !== groupKey(null));
  if (!top) {
    return { label, value: NONE, sub: "nenhum lido com gênero informado" };
  }
  const sub =
    read.length === 1
      ? "o único lido"
      : nf(top.count) + " dos " + nf(read.length) + " lidos";
  return { label, value: top.label, sub, text: true };
}

function paceKpi(read: readonly Book[], Y: number): Kpi {
  const label = "Ritmo de leitura";
  const years = read.flatMap((b) => (b.yearRead ? [b.yearRead] : []));
  if (!years.length) {
    return { label, value: NONE, sub: "registre o ano de leitura dos lidos" };
  }
  const first = Math.min(...years);
  const span = Math.max(Y, ...years) - first + 1;
  if (span === 1) {
    const unit = years.length === 1 ? "livro lido em " : "livros lidos em ";
    return { label, value: nf(years.length), sub: unit + first };
  }
  const rate = Math.round((years.length / span) * 10) / 10;
  const unit = rate < 2 ? "livro" : "livros";
  return {
    label,
    value: dec1.format(rate),
    sub: unit + " por ano desde " + first,
  };
}

/** Linhas com livros de um bloco (Leitura ou Situação), com barra relativa à maior. */
function segments<K extends string>(
  base: readonly Book[],
  infos: readonly StateInfo<K>[],
  key: (b: Book) => K
): StateSegment<K>[] {
  const counts = infos
    .map((s) => ({ ...s, count: base.filter((b) => key(b) === s.k).length }))
    .filter((s) => s.count);
  const bmax = Math.max(1, ...counts.map((s) => s.count));
  return counts.map((s) => ({
    ...s,
    bar: (s.count / bmax) * 100 + "%",
    pct: Math.round((s.count / Math.max(1, base.length)) * 100) + "%",
  }));
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

  // KPIs valem para o acervo todo, independentemente do escopo dos gráficos.
  const dataKpis: Kpi[] = [
    shelfKpi(books.length, withP.length, shelfPages),
    topGenreKpi(read),
    paceKpi(read, Y),
    {
      label: "Países de origem",
      ...orNone(
        distinctCount(books, "nationality"),
        "entre os autores do acervo",
        "nenhuma nacionalidade informada"
      ),
    },
  ];
  const thermo = estFull ? Math.min(100, (readPages / estFull) * 100) : 0;

  // Cada livro tem uma Leitura só, então o anel da Leitura soma o escopo inteiro.
  const readingSeg = segments(base, READINGS, (b) => b.reading);
  let acc = 0;
  const stops = readingSeg.map((s) => {
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
    readingSeg,
    situationSeg: segments(base, SITUATIONS, (b) => b.situation),
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
