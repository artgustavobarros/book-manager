import { describe, expect, it } from "vitest";

import { isbn10, isbnOf } from "./isbn";
import {
  amazonResult,
  fromApple,
  fromGoogle,
  fromOpenLibrary,
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
            releaseDate: "2020-01-01",
            artworkUrl100: "https://a/100x100bb.jpg",
          },
        ],
      })[0].cover
    ).toBe("https://a/600x600bb.jpg");
    expect(
      fromOpenLibrary({
        docs: [
          {
            title: "T",
            author_name: ["A", "B"],
            cover_i: 9,
            first_publish_year: 1900,
          },
        ],
      })[0]
    ).toMatchObject({
      author: "A, B",
      year: "1900",
      cover: "https://covers.openlibrary.org/b/id/9-L.jpg",
    });
    expect(fromGoogle({})).toEqual([]);
  });
});

describe("mergeResults", () => {
  it("deduplica, descarta sem título e prioriza capas", () => {
    const g = fromGoogle({
      items: [
        { volumeInfo: { title: "A" } },
        { volumeInfo: { title: "A" } },
        { volumeInfo: { title: "" } },
      ],
    });
    const a = [amazonResult("123", "https://img")];
    const out = mergeResults([g, a]);
    expect(out.map((r) => r.source)).toEqual([
      "Amazon (ISBN)",
      "Google Livros",
    ]);
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
