import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";
import { loadStandalone } from "@/tests/support/standalone";

import { groupBy, insights, scopeShelfStatus } from "./insights";
import { filterBooks } from "./shelf";
import type { Book } from "./types";

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

      // dataKpis divergem do standalone de propósito (ver describe "dataKpis").
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

  it("emprestado com ano de leitura conta como lido nos gráficos", () => {
    const d = insights(
      [
        makeBook({ status: "lido", yearRead: 2026, pages: 100 }),
        makeBook({
          status: "emprestado",
          borrower: "Joana",
          yearRead: 2026,
          pages: 200,
        }),
        makeBook({ status: "emprestado", borrower: "Lucas", pages: 50 }),
      ],
      {
        scope: "lidos",
        expanded: {},
        assignAll: false,
        assignMore: false,
        year: 2026,
      }
    );
    expect(d.yearCols).toMatchObject([{ year: 2026, count: 2, pages: 300 }]);
    expect(d.assignReadCount).toBe(2);
    expect(d.thermoLabel).toBe("300 de ~350 páginas do acervo");
  });
});

describe("dataKpis", () => {
  const kpis = (list: Book[], scope: "todos" | "lidos" = "todos") =>
    insights(list, {
      scope,
      expanded: {},
      assignAll: false,
      assignMore: false,
      year: 2026,
    }).dataKpis;
  const kpi = (list: Book[], label: string) => {
    const k = kpis(list).find((x) => x.label === label);
    return k && [k.value, k.sub];
  };
  const many = (n: number, o: Partial<Book>) =>
    Array.from({ length: n }, () => makeBook(o));
  const lido = (o: Partial<Book> = {}) => makeBook({ status: "lido", ...o });

  it("mostra os 4 KPIs na ordem da spec", () => {
    expect(kpis([makeBook()]).map((k) => k.label)).toEqual([
      "Páginas na estante",
      "Gênero mais lido",
      "Ritmo de leitura",
      "Países de origem",
    ]);
  });

  it("páginas na estante soma só os livros com páginas", () => {
    const list = [...many(108, { pages: 100 }), ...many(12, {})];
    expect(kpi(list, "Páginas na estante")).toEqual([
      "10.800",
      "somando 108 de 120 livros",
    ]);
    expect(kpi(many(40, { pages: 10 }), "Páginas na estante")).toEqual([
      "400",
      "somando os 40 livros",
    ]);
    expect(kpi([makeBook({ pages: 321 })], "Páginas na estante")).toEqual([
      "321",
      "somando 1 livro",
    ]);
    expect(kpi(many(3, {}), "Páginas na estante")).toEqual([
      "—",
      "nenhum livro com páginas informadas",
    ]);
  });

  it("gênero mais lido desempata em ordem alfabética", () => {
    const list = [
      ...many(18, { status: "lido", genre: "Romance" }),
      ...many(18, { status: "lido", genre: "Ensaio" }),
      ...many(9, { status: "lido", genre: "Poesia" }),
      ...many(30, { genre: "Conto" }),
    ];
    expect(kpi(list, "Gênero mais lido")).toEqual([
      "Ensaio",
      "18 dos 45 lidos",
    ]);
    expect(kpis(list)[1].text).toBe(true);
  });

  it("gênero não informado não conta", () => {
    const list = [
      ...many(5, { status: "lido" }),
      ...many(2, { status: "lido", genre: "Poesia" }),
    ];
    expect(kpi(list, "Gênero mais lido")).toEqual(["Poesia", "2 dos 7 lidos"]);
  });

  it("gênero mais lido: único lido e estados vazios", () => {
    expect(kpi([lido({ genre: "Conto" })], "Gênero mais lido")).toEqual([
      "Conto",
      "o único lido",
    ]);
    expect(kpi([makeBook({ genre: "Conto" })], "Gênero mais lido")).toEqual([
      "—",
      "nenhum livro lido ainda",
    ]);
    expect(kpi(many(2, { status: "lido" }), "Gênero mais lido")).toEqual([
      "—",
      "nenhum lido com gênero informado",
    ]);
  });

  it("ritmo de leitura desde o primeiro ano registrado", () => {
    const list = [2022, 2023, 2024, 2025, 2026].flatMap((y, i) =>
      many(i === 0 ? 4 : 3, { status: "lido", yearRead: y })
    );
    expect(kpi(list, "Ritmo de leitura")).toEqual([
      "3,2",
      "livros por ano desde 2022",
    ]);
    expect(
      kpi(many(8, { status: "lido", yearRead: 2023 }), "Ritmo de leitura")
    ).toEqual(["2", "livros por ano desde 2023"]);
    expect(
      kpi(many(2, { status: "lido", yearRead: 2023 }), "Ritmo de leitura")
    ).toEqual(["0,5", "livro por ano desde 2023"]);
  });

  it("ritmo de leitura só no ano atual e sem ano", () => {
    expect(
      kpi(many(3, { status: "lido", yearRead: 2026 }), "Ritmo de leitura")
    ).toEqual(["3", "livros lidos em 2026"]);
    expect(kpi([lido({ yearRead: 2026 })], "Ritmo de leitura")).toEqual([
      "1",
      "livro lido em 2026",
    ]);
    expect(kpi(many(4, { status: "lido" }), "Ritmo de leitura")).toEqual([
      "—",
      "registre o ano de leitura dos lidos",
    ]);
  });

  it("países de origem ignora caixa e vazios", () => {
    const list = [
      makeBook({ nationality: "brasileira" }),
      makeBook({ nationality: "Brasileira" }),
      makeBook({ nationality: "russa" }),
      makeBook({ nationality: " " }),
    ];
    expect(kpi(list, "Países de origem")).toEqual([
      "2",
      "entre os autores do acervo",
    ]);
    expect(kpi(many(2, {}), "Países de origem")).toEqual([
      "—",
      "nenhuma nacionalidade informada",
    ]);
  });

  it("não muda com o escopo dos gráficos", () => {
    expect(kpis(books, "lidos")).toEqual(kpis(books, "todos"));
  });
});

describe("atalho dos gráficos para a Estante", () => {
  const list = [
    makeBook({ genre: "Romance", status: "lido", yearRead: 2024 }),
    makeBook({ genre: "Romance", status: "nao-lido" }),
    makeBook({ genre: "Romance", status: "emprestado", yearRead: 2023 }),
    makeBook({ genre: "Romance", status: "emprestado" }),
  ];

  for (const scope of ["lidos", "todos"] as const) {
    it(`mostra os livros contados no gênero com escopo ${scope}`, () => {
      const [bar] = insights(list, {
        scope,
        expanded: {},
        assignAll: false,
        assignMore: false,
        year: 2026,
      }).genre.list;
      const shown = filterBooks(list, {
        q: "",
        status: scopeShelfStatus(scope),
        facet: { kind: "genero", value: bar.label },
      });
      expect(shown).toHaveLength(bar.count);
      expect(bar.count).toBe(scope === "lidos" ? 2 : 4);
    });
  }
});
