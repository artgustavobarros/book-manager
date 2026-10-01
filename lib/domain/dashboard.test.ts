import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";
import { loadStandalone } from "@/tests/support/standalone";

import { wallClock, yearFraction } from "./clock";
import { dashboard, greetingFor, todayLabel } from "./dashboard";

const TZ = "America/Sao_Paulo";
// 15 de junho de 2026, 15h em São Paulo.
const NOW = new Date("2026-06-15T18:00:00Z");

describe("clock", () => {
  it("usa o relógio do fuso, não o do servidor", () => {
    const late = new Date("2027-01-01T01:30:00Z"); // 31/12 22h30 em SP
    expect(wallClock(late, TZ)).toMatchObject({ year: 2026, month: 11, day: 31, hour: 22 });
    expect(wallClock(late, "UTC")).toMatchObject({ year: 2027, month: 0, day: 1, hour: 1 });
    expect(yearFraction(new Date("2026-01-01T03:00:00Z"), TZ)).toBe(0);
  });
});

describe("cabeçalho", () => {
  it("saudação por horário com o primeiro nome", () => {
    expect(greetingFor(9, "Ana Lima")).toBe("Bom dia, Ana");
    expect(greetingFor(15, "Ana Lima")).toBe("Boa tarde, Ana");
    expect(greetingFor(20, "")).toBe("Boa noite, bem-vindo de volta à bodega");
  });
  it("data por extenso com o dia da semana em maiúscula", () => {
    expect(todayLabel(NOW, TZ)).toBe("Segunda-feira, 15 de junho");
  });
});

describe("dashboard × standalone", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterAll(() => vi.useRealTimers());

  it("produz os mesmos KPIs, meta e listas que o painel() do standalone", () => {
    const oracle = loadStandalone();
    const expected = oracle.painel(oracle.state.books) as Record<string, any>;
    const d = dashboard(referenceBooks(), { goal: 24, now: NOW, tz: TZ, userName: "Ana Lima" });

    expect(d.kpis.map((k) => [k.label, k.value, k.sub])).toEqual(expected.kpis.map((k: any) => [k.label, k.value, k.sub]));
    expect(d.todayLabel).toBe(expected.todayLabel);
    expect(d.greeting).toBe(expected.greeting);
    expect(d.goalDone).toBe(expected.goalDone);
    expect(d.goalPct).toBe(expected.goalPct);
    expect(d.expectedPct).toBe(expected.expectedPct);
    expect(d.expectedN).toBe(expected.expectedN);
    expect(d.goalLine).toBe(expected.goalLine);
    expect(d.paceLabel).toBe(expected.paceLabel);
    expect(d.readingCount).toBe(expected.readingCount);
    expect(d.yearReads.map((b) => b.title)).toEqual(expected.yearReads.map((r: any) => r.title));
    expect(d.reading.map((b) => b.title)).toEqual(expected.reading.map((r: any) => r.title));
    expect(d.recent.map((b) => b.title)).toEqual(expected.recent.map((r: any) => r.title));
  });
});

describe("dashboard", () => {
  it("acervo vazio: selo de ritmo oculto e textos de vazio", () => {
    const e = dashboard([], { goal: 24, now: NOW, tz: TZ });
    expect(e.paceShow).toBe(false);
    expect(e.kpis[1].sub).toBe("—");
    expect(e.kpis[3].sub).toBe("todos em casa");
    expect(e.readingCount).toBe("");
  });

  it("meta cumprida", () => {
    const books = Array.from({ length: 3 }, () => makeBook({ status: "lido", yearRead: 2026 }));
    const m = dashboard(books, { goal: 2, now: NOW, tz: TZ });
    expect(m.pace).toBe("done");
    expect(m.paceLabel).toBe("Meta cumprida");
    expect(m.goalLine).toBe("Meta cumprida.");
    expect(m.goalPct).toBe("100%");
  });
});
