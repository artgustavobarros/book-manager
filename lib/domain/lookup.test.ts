import { describe, expect, it } from "vitest";

import { isbn10, isbnOf } from "./isbn";
import {
  amazonResult,
  fromApple,
  fromGoogle,
  fromOpenLibrary,
  type LookupResult,
  lookupUrls,
  mergeResults,
  titleMatch,
} from "./lookup";

describe("isbn", () => {
  it("reconhece ISBN-10/13 com hífens e espaços", () => {
    expect(isbnOf("978-85-5451-234-8")).toBe("9788554512348");
    expect(isbnOf("85 359 0277 x")).toBe("853590277X");
    expect(isbnOf("Torto arado")).toBeNull();
  });
  it("converte ISBN-13 (978) para ISBN-10", () => {
    expect(isbn10("9788535902778")).toBe("8535902775");
    expect(isbn10("9790000000001")).toBeNull();
    expect(isbn10("853590277X")).toBe("853590277X");
  });
  it("monta a URL da capa da Amazon", () => {
    expect(lookupUrls.amazonCover("9788535902778")).toBe(
      "https://images-na.ssl-images-amazon.com/images/P/8535902775.01.L.jpg"
    );
  });
});

describe("normalização das fontes", () => {
  it("Google Livros", () => {
    const [r] = fromGoogle({
      items: [
        {
          volumeInfo: {
            title: "Torto arado",
            authors: ["Itamar Vieira Junior"],
            categories: ["Fiction / Literary"],
            publisher: "Todavia",
            publishedDate: "2019-08-01",
            pageCount: 264,
            imageLinks: {
              thumbnail: "http://books.google.com/x?id=1&edge=curl",
            },
          },
        },
      ],
    });
    expect(r).toEqual({
      source: "Google Livros",
      title: "Torto arado",
      author: "Itamar Vieira Junior",
      genre: "Fiction / Literary",
      publisher: "Todavia",
      year: "2019",
      pages: "264",
      cover: "https://books.google.com/x?id=1",
    });
  });
  it("Apple Books e Open Library", () => {
    expect(
      fromApple({
        results: [
          {
            trackName: "T",
            artistName: "A",
            primaryGenreName: "Fiction & Literature",
            releaseDate: "2020-01-01",
            artworkUrl100: "https://a/100x100bb.jpg",
          },
        ],
      })[0]
    ).toMatchObject({
      cover: "https://a/600x600bb.jpg",
      genre: "Fiction & Literature",
    });
    expect(
      fromOpenLibrary({
        docs: [
          {
            title: "T",
            author_name: ["A", "B"],
            subject: ["Poetry", "Literature"],
            cover_i: 9,
            first_publish_year: 1900,
          },
        ],
      })[0]
    ).toMatchObject({
      author: "A, B",
      genre: "Poetry",
      year: "1900",
      cover: "https://covers.openlibrary.org/b/id/9-L.jpg",
    });
    expect(fromGoogle({})).toEqual([]);
    expect(
      fromGoogle({ items: [{ volumeInfo: { title: "T" } }] })[0].genre
    ).toBe("");
    expect(
      fromApple({ results: [{ primaryGenreName: "Books" }] })[0].genre
    ).toBe("");
  });
});

describe("mergeResults", () => {
  const result = (
    title: string,
    source: LookupResult["source"] = "Google Livros",
    options: Partial<LookupResult> = {}
  ): LookupResult => ({
    source,
    title,
    author: "",
    genre: "",
    publisher: "",
    year: "",
    pages: "",
    cover: "",
    ...options,
  });

  it("deduplica por fonte e descarta títulos vazios", () => {
    const g = fromGoogle({
      items: [
        { volumeInfo: { title: "A" } },
        { volumeInfo: { title: "A" } },
        { volumeInfo: { title: "" } },
      ],
    });
    const a = [result("A", "Apple Books", { cover: "https://img" })];
    const out = mergeResults([g, a], "A");
    expect(out.map((r) => r.source)).toEqual(["Apple Books", "Google Livros"]);
  });

  it("põe título exato sem capa antes de subtítulo com capa", () => {
    const out = mergeResults(
      [
        [
          result("Torto arado: guia de leitura", "Google Livros", {
            cover: "https://img",
          }),
        ],
        [result("Torto arado", "Open Library")],
      ],
      "Torto arado"
    );
    expect(out.map((r) => r.title)).toEqual([
      "Torto arado",
      "Torto arado: guia de leitura",
    ]);
  });

  it("compara acentos e termos do título antes do autor", () => {
    const out = mergeResults(
      [
        [
          result("Crônicas", "Google Livros", { author: "Memórias Póstumas" }),
          result("Memórias antigas", "Apple Books"),
          result("Memórias Póstumas de Brás Cubas", "Open Library"),
        ],
      ],
      "memorias postumas"
    );
    expect(out.map((r) => r.title)).toEqual([
      "Memórias Póstumas de Brás Cubas",
      "Memórias antigas",
      "Crônicas",
    ]);
  });

  it("desempata por capa e depois mantém a ordem original", () => {
    const out = mergeResults(
      [
        [
          result("Guia de leitura: vol. A", "Google Livros"),
          result("Guia de leitura: vol. B", "Open Library", {
            cover: "https://img",
          }),
          result("Guia de leitura: vol. C", "Apple Books"),
        ],
      ],
      "guia de leitura"
    );
    expect(out.map((r) => r.title)).toEqual([
      "Guia de leitura: vol. B",
      "Guia de leitura: vol. A",
      "Guia de leitura: vol. C",
    ]);
  });

  it("limita a 12 somente após ordenar por relevância", () => {
    const unrelated = Array.from({ length: 12 }, (_, i) =>
      result(`Outro livro ${i}`, "Google Livros", { cover: "https://img" })
    );
    const out = mergeResults(
      [unrelated, [result("Torto arado", "Open Library")]],
      "Torto arado"
    );
    expect(out).toHaveLength(12);
    expect(out[0].title).toBe("Torto arado");
  });

  it("mantém a capa da Amazon ao fim da busca por ISBN", () => {
    const isbn = "9788554512348";
    const google = Array.from({ length: 12 }, (_, i) =>
      result(`Edição ${i}`, "Google Livros")
    );
    const out = mergeResults(
      [
        [result("Resultado Apple", "Apple Books", { cover: "https://apple" })],
        google,
        [result("Resultado Open Library", "Open Library")],
        [amazonResult(isbn, "https://amazon")],
      ],
      isbn
    );
    expect(out).toHaveLength(12);
    expect(out[0].source).toBe("Google Livros");
    expect(out.at(-1)?.source).toBe("Amazon (ISBN)");
    expect(out.some((r) => r.source === "Apple Books")).toBe(false);
  });
});

describe("titleMatch", () => {
  it("compara os 14 primeiros caracteres normalizados", () => {
    expect(
      titleMatch(
        "Grande Sertão: Veredas (edição comemorativa)",
        "Grande sertão: veredas"
      )
    ).toBe(true);
    expect(titleMatch("1984", "Admirável mundo novo")).toBe(false);
    expect(titleMatch("", "x")).toBe(false);
  });
});
