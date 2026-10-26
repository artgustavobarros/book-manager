import { describe, expect, it } from "vitest";

import { makeBook } from "@/tests/support/reference";

import { wallClock, yearFraction } from "./clock";
import { dashboard, greetingFor, todayLabel } from "./dashboard";

const TZ = "America/Sao_Paulo";
// 15 de junho de 2026, 15h em São Paulo.
const NOW = new Date("2026-06-15T18:00:00Z");

describe("clock", () => {
  it("usa o relógio do fuso, não o do servidor", () => {
    const late = new Date("2027-01-01T01:30:00Z"); // 31/12 22h30 em SP
    expect(wallClock(late, TZ)).toMatchObject({
      year: 2026,
      month: 11,
      day: 31,
      hour: 22,
    });
    expect(wallClock(late, "UTC")).toMatchObject({
      year: 2027,
      month: 0,
      day: 1,
      hour: 1,
    });
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

describe("dashboard", () => {
  it("acervo vazio: selo de ritmo oculto e textos de vazio", () => {
    const e = dashboard([], { goal: 24, now: NOW, tz: TZ });
    expect(e.paceShow).toBe(false);
    expect(e.kpis[1].sub).toBe("—");
    expect(e.kpis[3].sub).toBe("todos em casa");
    expect(e.readingCount).toBe("");
  });

  it("meta cumprida", () => {
    const books = Array.from({ length: 3 }, () =>
      makeBook({ reading: "lido", yearRead: 2026 })
    );
    const m = dashboard(books, { goal: 2, now: NOW, tz: TZ });
    expect(m.pace).toBe("done");
    expect(m.paceLabel).toBe("Meta cumprida");
    expect(m.goalLine).toBe("Meta cumprida.");
    expect(m.goalPct).toBe("100%");
  });

  it("lido emprestado conta na meta e em Lidos; emprestado não lido, não", () => {
    const lent = makeBook({
      reading: "lido",
      situation: "emprestado",
      borrower: "Joana",
      yearRead: 2026,
    });
    const books = [
      makeBook({ reading: "lido", yearRead: 2026 }),
      lent,
      makeBook({ situation: "emprestado", borrower: "Lucas", yearRead: 2026 }),
    ];
    const d = dashboard(books, { goal: 24, now: NOW, tz: TZ });
    expect(d.goalDone).toBe(2);
    expect(d.yearReads).toContain(lent);
    expect(d.kpis[1].value).toBe("2");
  });
});
