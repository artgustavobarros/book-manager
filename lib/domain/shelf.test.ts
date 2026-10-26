import { describe, expect, it } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";

import {
  DEFAULT_SHELF,
  facetLabel,
  facetTest,
  filterBooks,
  parseFacet,
  parseShelfParams,
  SORT_KEYS,
  shelfChips,
  shelfHref,
  sortBooks,
  toShelfParams,
} from "./shelf";

const books = referenceBooks();
const titles = (bs: { title: string }[]) => bs.map((b) => b.title);

describe("filterBooks", () => {
  it("busca sem acento em vários campos", () => {
    expect(
      titles(
        filterBooks(books, {
          q: "sertao",
          reading: "todos",
          situation: "todas",
          facet: null,
        })
      )
    ).toEqual(["Grande sertão: veredas"]);
    // borrower e notes também entram na busca
    expect(
      titles(
        filterBooks(books, {
          q: "paula",
          reading: "todos",
          situation: "todas",
          facet: null,
        })
      )
    ).toEqual(["Mrs. Dalloway"]);
    expect(
      titles(
        filterBooks(books, {
          q: "pagina 180",
          reading: "todos",
          situation: "todas",
          facet: null,
        })
      )
    ).toEqual(["Grande sertão: veredas"]);
  });

  it("filtra por Leitura, Situação e favoritos", () => {
    const all = { q: "", facet: null } as const;
    expect(
      filterBooks(books, { ...all, reading: "lido", situation: "todas" })
    ).toHaveLength(16);
    const lentRead = makeBook({ reading: "lido", situation: "emprestado" });
    const lentUnread = makeBook({ situation: "emprestado" });
    const homeRead = makeBook({ reading: "lido" });
    const three = [lentRead, lentUnread, homeRead];
    expect(
      filterBooks(three, { ...all, reading: "lido", situation: "emprestado" })
    ).toEqual([lentRead]);
    expect(
      filterBooks(three, { ...all, reading: "todos", situation: "emprestado" })
    ).toEqual([lentRead, lentUnread]);
    const withFav = [...books.slice(0, 3), makeBook({ favorite: true })];
    expect(
      filterBooks(withFav, { ...all, reading: "fav", situation: "todas" })
    ).toHaveLength(1);
  });

  it("aplica facetas", () => {
    const kafka = filterBooks(books, {
      q: "",
      reading: "todos",
      situation: "todas",
      facet: { kind: "autor", value: "Franz Kafka" },
    });
    expect(titles(kafka)).toEqual(["A metamorfose", "O processo"]);
    const genre = filterBooks(books, {
      q: "",
      reading: "todos",
      situation: "todas",
      facet: { kind: "genero", value: "Terror e gótico" },
    });
    expect(titles(genre)).toEqual(["Frankenstein", "Drácula"]);
    const noGenre = filterBooks(
      [makeBook({ genre: null }), makeBook({ genre: "Romance" })],
      {
        q: "",
        reading: "todos",
        situation: "todas",
        facet: { kind: "genero", value: "Não informado" },
      }
    );
    expect(noGenre).toHaveLength(1);
    const read2023 = filterBooks(books, {
      q: "",
      reading: "lido",
      situation: "todas",
      facet: { kind: "lidos-em", value: "2023" },
    });
    expect(titles(read2023)).toEqual(["1984", "Quarto de despejo"]);
  });
});

describe("sortBooks", () => {
  it("ordena por nº, título, editora e páginas como no standalone", () => {
    expect(sortBooks(books, "ordem")[0].orderNo).toBe(1);
    expect(sortBooks(books, "ordem-desc")[0].orderNo).toBe(30);
    expect(sortBooks(books, "titulo")[0].title).toBe("1984");
    expect(sortBooks(books, "titulo-desc")[0].title).toBe("Vidas secas");
    expect(sortBooks(books, "paginas")[0].title).toBe("O idiota");
    expect(sortBooks(books, "recentes")[0].title).toBe("Kindred");
    expect(sortBooks(books, "lanc-antigos")[0].title).toBe(
      "Orgulho e preconceito"
    );
    const pubs = sortBooks(
      [
        makeBook({ publisher: null, title: "x" }),
        makeBook({ publisher: "Zahar", title: "y" }),
      ],
      "editora"
    );
    // Diverge do standalone de propósito (BP-12): lá a editora vazia vira "~",
    // que o ICU ordena antes das letras. Aqui os vazios ficam no fim.
    expect(titles(pubs)).toEqual(["y", "x"]);
  });

  it("põe autor e editora vazios no fim, na ordem de entrada (BP-12)", () => {
    for (const [sort, field] of [
      ["editora", "publisher"],
      ["autor", "author"],
    ] as const) {
      const sorted = sortBooks(
        [
          makeBook({ [field]: "Zahar", title: "zahar" }),
          makeBook({ [field]: null, title: "nulo" }),
          makeBook({ [field]: "Abril", title: "abril" }),
          makeBook({ [field]: "", title: "vazio" }),
          makeBook({ [field]: "  ", title: "espacos" }),
        ],
        sort
      );
      expect(titles(sorted), sort).toEqual([
        "abril",
        "zahar",
        "nulo",
        "vazio",
        "espacos",
      ]);
    }
  });

  it("ignora acento e caixa entre os preenchidos", () => {
    const sorted = sortBooks(
      [
        makeBook({ author: "Érico Verissimo", title: "erico" }),
        makeBook({ author: null, title: "nulo" }),
        makeBook({ author: "eça de Queirós", title: "eca" }),
      ],
      "autor"
    );
    expect(titles(sorted)).toEqual(["eca", "erico", "nulo"]);
  });
});

describe("chips", () => {
  it("conta por Leitura e por Situação", () => {
    const chips = shelfChips(books, { reading: "todos", situation: "todas" });
    expect(chips.reading[0]).toMatchObject({ k: "todos", count: 30 });
    expect(chips.reading.find((c) => c.k === "lido")?.count).toBe(16);
    expect(chips.reading.at(-1)).toMatchObject({
      k: "fav",
      label: "♥ Favoritos",
      count: 0,
    });
    expect(chips.situation.map((c) => [c.k, c.count])).toEqual([
      ["todas", 30],
      ["em-casa", 25],
      ["emprestado", 3],
      ["doado", 2],
    ]);
  });

  it("cada linha conta dentro do filtro escolhido na outra", () => {
    const three = [
      makeBook({ reading: "lido", situation: "emprestado" }),
      makeBook({ situation: "emprestado" }),
      makeBook({ reading: "lido" }),
    ];
    const chips = shelfChips(three, {
      reading: "lido",
      situation: "emprestado",
    });
    expect(chips.reading.find((c) => c.k === "lido")?.count).toBe(1);
    expect(chips.reading[0].count).toBe(2);
    expect(chips.situation.find((c) => c.k === "em-casa")?.count).toBe(1);
    expect(chips.situation[0].count).toBe(2);
  });
});

describe("facetas e URL", () => {
  it("serializa e lê a faceta", () => {
    expect(parseFacet("autor:Machado de Assis")).toEqual({
      kind: "autor",
      value: "Machado de Assis",
    });
    expect(parseFacet("xpto:1")).toBeNull();
    expect(parseFacet("autor:")).toBeNull();
    expect(facetLabel({ kind: "lidos-em", value: "2025" })).toBe(
      "Lidos em 2025"
    );
    expect(
      facetTest({ kind: "autor", value: "machado de assis" })(books[2])
    ).toBe(true);
  });

  it("faz ida e volta do estado, omitindo padrões", () => {
    expect(toShelfParams(DEFAULT_SHELF).toString()).toBe("");
    const state = {
      q: "kafka",
      reading: "lendo" as const,
      situation: "emprestado" as const,
      facet: { kind: "editora" as const, value: "Record" },
      sort: "paginas" as const,
      view: "list" as const,
      page: 1,
    };
    const params = toShelfParams(state);
    expect(parseShelfParams(params)).toEqual(state);
    expect(params.get("leitura")).toBe("lendo");
    expect(params.get("situacao")).toBe("emprestado");
    expect(shelfHref({ situation: "emprestado" })).toBe(
      "/estante?situacao=emprestado"
    );
    expect(
      parseShelfParams(
        new URLSearchParams("leitura=bogus&situacao=bogus&ordem=bogus")
      )
    ).toEqual(DEFAULT_SHELF);
    // Links antigos com ?status= deixam de filtrar (ADR 0001).
    expect(parseShelfParams(new URLSearchParams("status=lido"))).toEqual(
      DEFAULT_SHELF
    );
  });
});

describe("Estante: ordenações × filtros", () => {
  // Saída completa no acervo de referência (era conferida contra o standalone, que
  // saiu do repositório). Regravar só de propósito: pnpm test -u
  it("todas as ordenações com os filtros principais", () => {
    const cases = [
      { q: "", reading: "todos", situation: "todas" },
      { q: "a", reading: "todos", situation: "todas" },
      { q: "", reading: "lido", situation: "todas" },
      { q: "kafka", reading: "todos", situation: "todas" },
      { q: "", reading: "nao-lido", situation: "em-casa" },
      { q: "", reading: "todos", situation: "emprestado" },
    ] as const;
    const out: Record<string, string[]> = {};
    for (const sort of SORT_KEYS) {
      for (const c of cases) {
        out[`${sort} / ${c.q || "-"} / ${c.reading} / ${c.situation}`] = titles(
          sortBooks(filterBooks(books, { ...c, facet: null }), sort)
        );
      }
    }
    expect(out).toMatchSnapshot();
  });
});
