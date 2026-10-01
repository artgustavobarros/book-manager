/** Seletores do Painel (porta de `painel()` do standalone). */
import { wallClock, yearFraction } from "./clock";
import { nf } from "./text";
import type { Book } from "./types";

export const DEFAULT_GOAL = 24;

export interface Kpi {
  label: string;
  value: string;
  sub: string;
}

export type Pace = "done" | "on" | "behind";

export interface Dashboard {
  year: number;
  todayLabel: string;
  greeting: string;
  kpis: Kpi[];
  goal: number;
  goalDone: number;
  goalPct: string;
  expectedPct: string;
  expectedN: number;
  goalLine: string;
  pace: Pace;
  paceLabel: string;
  /** Com o acervo vazio, o selo de ritmo não aparece. */
  paceShow: boolean;
  yearReads: Book[];
  reading: Book[];
  readingCount: string;
  recent: Book[];
}

const pg = (b: Book) => b.pages || 0;

export function distinctCount(books: readonly Book[], key: "author" | "nationality" | "publisher" | "genre"): number {
  return new Set(books.map((b) => (b[key] || "").trim().toLowerCase()).filter(Boolean)).size;
}

export function greetingFor(hour: number, name: string | null | undefined): string {
  const first = (name || "").trim().split(/\s+/)[0];
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return hello + (first ? ", " + first : ", bem-vindo de volta à bodega");
}

export function todayLabel(now: Date, tz: string): string {
  return now
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })
    .replace(/^./, (c) => c.toUpperCase());
}

export function dashboard(
  books: readonly Book[],
  opts: { goal: number; now: Date; tz: string; userName?: string | null },
): Dashboard {
  const { goal, now, tz } = opts;
  const clock = wallClock(now, tz);
  const Y = clock.year;
  const read = books.filter((b) => b.status === "lido");
  const withP = books.filter((b) => pg(b) > 0);
  const acqY = books.filter((b) => (b.acquiredOn || "").startsWith(String(Y))).length;
  const lent = books.filter((b) => b.status === "emprestado").length;

  const kpis: Kpi[] = [
    {
      label: "Livros no acervo",
      value: nf(books.length),
      sub: acqY ? "+" + acqY + " adquiridos em " + Y : "nenhum adquirido em " + Y,
    },
    {
      label: "Lidos",
      value: nf(read.length),
      sub: books.length ? Math.round((read.length / books.length) * 100) + "% do acervo" : "—",
    },
    {
      label: "Páginas lidas",
      value: nf(read.reduce((s, b) => s + pg(b), 0)),
      sub: withP.length
        ? "média de " + nf(Math.round(withP.reduce((s, b) => s + pg(b), 0) / withP.length)) + " p. por livro"
        : "—",
    },
    { label: "Emprestados", value: nf(lent), sub: lent ? "fora de casa agora" : "todos em casa" },
    {
      label: "Autores",
      value: nf(distinctCount(books, "author")),
      sub: distinctCount(books, "nationality") + " nacionalidades",
    },
  ];

  const frac = yearFraction(now, tz);
  const yearReads = read.filter((b) => b.yearRead === Y);
  const done = yearReads.length;
  const remaining = Math.max(0, goal - done);
  const monthsLeft = 12 - clock.month;
  const expectedN = Math.round(goal * frac);
  const onPace = done >= expectedN;
  const reading = books.filter((b) => b.status === "lendo");
  const recent = [...books].sort((a, b) => (b.acquiredOn || "").localeCompare(a.acquiredOn || "")).slice(0, 5);

  return {
    year: Y,
    todayLabel: todayLabel(now, tz),
    greeting: greetingFor(clock.hour, opts.userName),
    kpis,
    goal,
    goalDone: done,
    goalPct: Math.min(100, (done / goal) * 100) + "%",
    expectedPct: Math.min(100, frac * 100) + "%",
    expectedN,
    goalLine: remaining
      ? "Faltam " +
        remaining +
        (remaining === 1 ? " livro" : " livros") +
        " · cerca de " +
        (remaining / monthsLeft).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) +
        " por mês até dezembro"
      : "Meta cumprida.",
    pace: done >= goal ? "done" : onPace ? "on" : "behind",
    paceLabel: done >= goal ? "Meta cumprida" : onPace ? "No ritmo" : expectedN - done + " abaixo do ritmo",
    paceShow: books.length > 0,
    yearReads,
    reading,
    readingCount: reading.length ? reading.length + (reading.length === 1 ? " livro" : " livros") : "",
    recent,
  };
}
