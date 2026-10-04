import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";
import { loadStandalone } from "@/tests/support/standalone";

import { groupBy, insights } from "./insights";

const NOW = new Date("2026-06-15T18:00:00Z");
const books = referenceBooks();
type Any = any;

const stripColors = (bg: string) =>
  bg.replace(/(var\(--[a-z-]+\)|#[0-9a-f]+|oklch\([^)]*\))/g, "C");

describe("insights × standalone", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterAll(() => vi.useRealTimers());

  const variants = [
    { scope: "todos", expanded: {}, assignAll: false, assignMore: false },
    {
      scope: "lidos",
      expanded: { genre: true, nationality: true, publisher: true },
      assignAll: true,
      assignMore: false,
    },
    { scope: "todos", expanded: {}, assignAll: true, assignMore: true },
  ] as const;

  for (const v of variants) {
    it(`bate com dados() em ${JSON.stringify(v)}`, () => {
      const oracle = loadStandalone({
        state: { ...v, expanded: { ...v.expanded } },
      });
      // O standalone indexa `expanded` pelo nome do campo, como aqui.
      const e = oracle.dados(oracle.state.books) as Any;
      const d = insights(books, { ...v, year: 2026 });

      expect(d.scopeCaption).toBe(e.scopeCaption);
      expect(d.dataKpis.map((k) => [k.label, k.value, k.sub])).toEqual(
        e.dataKpis.map((k: Any) => [k.label, k.value, k.sub])
      );
      expect([d.thermoPct, d.thermoPctLabel, d.thermoLabel]).toEqual([
        e.thermoPct,
        e.thermoPctLabel,
        e.thermoLabel,
      ]);
      expect(d.bigBooks.map((r) => [r.rank, r.book.title, r.pages])).toEqual(
        e.bigBooks.map((r: Any) => [r.rank, r.title, r.pages])
      );
      expect([d.baseLabel, d.donutTotal, stripColors(d.donutBg)]).toEqual([
        e.baseLabel,
        e.donutTotal,
        stripColors(e.donutBg),
      ]);
      expect(d.statusSeg.map((s) => [s.label, s.count, s.bar, s.pct])).toEqual(
        e.statusSeg.map((s: Any) => [s.label, s.count, s.bar, s.pct])
      );
      for (const [ours, theirs] of [
        [d.genre, e.genre],
        [d.nat, e.nat],
        [d.pub, e.pub],
      ] as const) {
        expect(ours.list.map((r) => [r.label, r.count, r.pct])).toEqual(
          theirs.list.map((r: Any) => [r.label, r.count, r.pct])
        );
        expect([ours.badge, ours.more, ours.moreLabel]).toEqual([
          theirs.badge,
          theirs.more,
          theirs.moreLabel,
        ]);
      }
      expect(
        d.yearCols.map((c) => [String(c.year), c.count, c.sub, c.pct])
      ).toEqual(e.yearCols.map((c: Any) => [c.label, c.count, c.sub, c.pct]));
      expect(d.yearBadge).toBe(e.yearBadge);
      expect(
        d.assignRows.map((r) => [r.book.title, r.years.map((y) => y.on)])
      ).toEqual(
        e.assignRows.map((r: Any) => [
          r.title,
          r.years.map((y: Any) => y.bg === "var(--ink)"),
        ])
      );
      expect([d.assignEmpty, d.assignMoreShow, d.assignMoreLabel]).toEqual([
        e.assignEmpty,
        e.assignMoreShow,
        e.assignMoreLabel,
      ]);
    });
  }
});

describe("insights", () => {
  it("agrupa valores vazios como 'Não informado'", () => {
    const g = groupBy(
      [
        makeBook({ genre: " " }),
        makeBook({ genre: null }),
        makeBook({ genre: "Romance" }),
      ],
      "genre"
    );
    expect(g).toEqual([
      { key: "não informado", label: "Não informado", count: 2 },
      { key: "romance", label: "Romance", count: 1 },
    ]);
  });

  it("acervo vazio não quebra", () => {
    const d = insights([], {
      scope: "todos",
      expanded: {},
      assignAll: false,
      assignMore: false,
      year: 2026,
    });
    expect(d.donutBg).toBe("var(--soft)");
    expect(d.yearCols).toEqual([]);
    expect(d.assignEmpty).toBe(true);
  });
});
