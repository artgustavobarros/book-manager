import { describe, expect, it } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";

import { groupBy, insights, scopeShelfReading } from "./insights";
import { filterBooks } from "./shelf";
import type { Book } from "./types";

const books = referenceBooks();

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

  it("lido emprestado conta como lido nos gráficos", () => {
    const d = insights(
      [
        makeBook({ reading: "lido", yearRead: 2026, pages: 100 }),
        makeBook({
          reading: "lido",
          situation: "emprestado",
          borrower: "Joana",
          yearRead: 2026,
          pages: 200,
        }),
        makeBook({
          situation: "emprestado",
          borrower: "Lucas",
          yearRead: 2026,
          pages: 50,
        }),
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
  const lido = (o: Partial<Book> = {}) => makeBook({ reading: "lido", ...o });

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
      ...many(18, { reading: "lido", genre: "Romance" }),
      ...many(18, { reading: "lido", genre: "Ensaio" }),
      ...many(9, { reading: "lido", genre: "Poesia" }),
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
      ...many(5, { reading: "lido" }),
      ...many(2, { reading: "lido", genre: "Poesia" }),
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
    expect(kpi(many(2, { reading: "lido" }), "Gênero mais lido")).toEqual([
      "—",
      "nenhum lido com gênero informado",
    ]);
  });

  it("ritmo de leitura desde o primeiro ano registrado", () => {
    const list = [2022, 2023, 2024, 2025, 2026].flatMap((y, i) =>
      many(i === 0 ? 4 : 3, { reading: "lido", yearRead: y })
    );
    expect(kpi(list, "Ritmo de leitura")).toEqual([
      "3,2",
      "livros por ano desde 2022",
    ]);
    expect(
      kpi(many(8, { reading: "lido", yearRead: 2023 }), "Ritmo de leitura")
    ).toEqual(["2", "livros por ano desde 2023"]);
    expect(
      kpi(many(2, { reading: "lido", yearRead: 2023 }), "Ritmo de leitura")
    ).toEqual(["0,5", "livro por ano desde 2023"]);
  });

  it("ritmo de leitura só no ano atual e sem ano", () => {
    expect(
      kpi(many(3, { reading: "lido", yearRead: 2026 }), "Ritmo de leitura")
    ).toEqual(["3", "livros lidos em 2026"]);
    expect(kpi([lido({ yearRead: 2026 })], "Ritmo de leitura")).toEqual([
      "1",
      "livro lido em 2026",
    ]);
    expect(kpi(many(4, { reading: "lido" }), "Ritmo de leitura")).toEqual([
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
    makeBook({ genre: "Romance", reading: "lido", yearRead: 2024 }),
    makeBook({ genre: "Romance", reading: "nao-lido" }),
    makeBook({
      genre: "Romance",
      reading: "lido",
      situation: "emprestado",
      yearRead: 2023,
    }),
    makeBook({ genre: "Romance", situation: "emprestado" }),
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
        reading: scopeShelfReading(scope),
        situation: "todas",
        facet: { kind: "genero", value: bar.label },
      });
      expect(shown).toHaveLength(bar.count);
      expect(bar.count).toBe(scope === "lidos" ? 2 : 4);
    });
  }
});

describe("Leitura e Situação", () => {
  const list = [
    makeBook({ reading: "lido", yearRead: 2024 }),
    makeBook({ reading: "lido", situation: "emprestado", yearRead: 2023 }),
    makeBook({ situation: "emprestado" }),
    makeBook({ reading: "nao-lido" }),
    makeBook({ reading: "lido", situation: "doado" }),
  ];
  const opts = {
    expanded: {},
    assignAll: false,
    assignMore: false,
    year: 2026,
  } as const;

  it("cada linha mostra os livros que o clique abre na Estante", () => {
    const d = insights(list, { ...opts, scope: "todos" });
    for (const s of d.readingSeg) {
      expect(s.count).toBe(
        filterBooks(list, {
          q: "",
          reading: s.k,
          situation: "todas",
          facet: null,
        }).length
      );
    }
    for (const s of d.situationSeg) {
      expect(s.count).toBe(
        filterBooks(list, {
          q: "",
          reading: "todos",
          situation: s.k,
          facet: null,
        }).length
      );
    }
    expect(d.readingSeg.map((s) => [s.k, s.count])).toEqual([
      ["nao-lido", 2],
      ["lido", 3],
    ]);
    expect(d.situationSeg.map((s) => [s.k, s.count, s.pct])).toEqual([
      ["em-casa", 2, "40%"],
      ["emprestado", 2, "40%"],
      ["doado", 1, "20%"],
    ]);
    // Cada livro tem uma Leitura só: o anel fecha em 100%.
    expect(d.donutBg).toMatch(/ 100%\)$/);
  });

  it("no escopo dos lidos, a Situação mostra onde estão os lidos", () => {
    const d = insights(list, { ...opts, scope: "lidos" });
    expect(d.readingSeg.map((s) => [s.k, s.count])).toEqual([["lido", 3]]);
    expect(d.situationSeg.map((s) => [s.k, s.count])).toEqual([
      ["em-casa", 1],
      ["emprestado", 1],
      ["doado", 1],
    ]);
  });
});
