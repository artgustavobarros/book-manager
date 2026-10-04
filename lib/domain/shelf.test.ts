import { describe, expect, it } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";

import {
  DEFAULT_SHELF,
  facetLabel,
  facetTest,
  filterBooks,
  parseFacet,
  parseShelfParams,
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
      titles(filterBooks(books, { q: "sertao", status: "todos", facet: null }))
    ).toEqual(["Grande sertão: veredas"]);
    // borrower e notes também entram na busca
    expect(
      titles(filterBooks(books, { q: "paula", status: "todos", facet: null }))
    ).toEqual(["Mrs. Dalloway"]);
    expect(
      titles(
        filterBooks(books, { q: "pagina 180", status: "todos", facet: null })
      )
    ).toEqual(["Grande sertão: veredas"]);
  });

  it("filtra por status e favoritos", () => {
    expect(
      filterBooks(books, { q: "", status: "lido", facet: null })
    ).toHaveLength(16);
    const withFav = [...books.slice(0, 3), makeBook({ favorite: true })];
    expect(
      filterBooks(withFav, { q: "", status: "fav", facet: null })
    ).toHaveLength(1);
  });

  it("aplica facetas", () => {
    const kafka = filterBooks(books, {
      q: "",
      status: "todos",
      facet: { kind: "autor", value: "Franz Kafka" },
    });
    expect(titles(kafka)).toEqual(["A metamorfose", "O processo"]);
    const genre = filterBooks(books, {
      q: "",
      status: "todos",
      facet: { kind: "genero", value: "Terror e gótico" },
    });
    expect(titles(genre)).toEqual(["Frankenstein", "Drácula"]);
    const noGenre = filterBooks(
      [makeBook({ genre: null }), makeBook({ genre: "Romance" })],
      {
        q: "",
        status: "todos",
        facet: { kind: "genero", value: "Não informado" },
      }
    );
    expect(noGenre).toHaveLength(1);
    const read2023 = filterBooks(books, {
      q: "",
      status: "lido",
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
    // Fiel ao standalone: editora vazia vira "~", que o ICU ordena antes das letras.
    expect(titles(pubs)).toEqual(["x", "y"]);
  });
});

describe("chips", () => {
  it("conta por status", () => {
    const chips = shelfChips(books);
    expect(chips[0]).toMatchObject({ k: "todos", count: 30 });
    expect(chips.find((c) => c.k === "lido")?.count).toBe(16);
    expect(chips.at(-1)).toMatchObject({
      k: "fav",
      label: "♥ Favoritos",
      count: 0,
    });
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
      status: "lendo" as const,
      facet: { kind: "editora" as const, value: "Record" },
      sort: "paginas" as const,
      view: "list" as const,
      page: 1,
    };
    const params = toShelfParams(state);
    expect(parseShelfParams(params)).toEqual(state);
    expect(shelfHref({ status: "emprestado" })).toBe(
      "/estante?status=emprestado"
    );
    expect(
      parseShelfParams(new URLSearchParams("status=bogus&ordem=bogus"))
    ).toEqual(DEFAULT_SHELF);
  });
});

describe("estante × standalone", () => {
  it("todas as ordenações e filtros produzem a mesma lista", async () => {
    const { loadStandalone } = await import("@/tests/support/standalone");
    const { SORT_KEYS } = await import("./shelf");
    const oracle = loadStandalone({ state: { limit: 1000, page: "estante" } });
    const cases = [
      { q: "", status: "todos" as const },
      { q: "a", status: "todos" as const },
      { q: "", status: "lido" as const },
      { q: "kafka", status: "todos" as const },
      { q: "", status: "nao-lido" as const },
    ];
    for (const sort of SORT_KEYS) {
      for (const c of cases) {
        Object.assign(oracle.state, {
          sort,
          q: c.q,
          status: c.status,
          facet: null,
        });
        const expected = (
          oracle.estante(oracle.state.books) as { books: { title: string }[] }
        ).books.map((b) => b.title);
        const ours = sortBooks(
          filterBooks(books, { q: c.q, status: c.status, facet: null }),
          sort
        ).map((b) => b.title);
        expect(ours, `${sort} / ${JSON.stringify(c)}`).toEqual(expected);
      }
    }
  });
});
