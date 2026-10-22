import { describe, expect, it } from "vitest";

import { makeBook } from "@/tests/support/reference";

import {
  EMPTY_SELECTION,
  filterPublicBooks,
  ogFor,
  ogImagePath,
  ogVersion,
  ownerSlugBase,
  publicPath,
  resolvePublicSelection,
  scopeFromShelf,
  selectionOf,
  sharedNotice,
  shareTargets,
  slugify,
  toPublicBooks,
} from "./share";
import type { PublicBook } from "./types";

const pb = (over: Partial<PublicBook> = {}): PublicBook => {
  const [b] = toPublicBooks([
    makeBook({ status: "nao-lido", ...over } as never),
  ]);
  return b;
};

const books: PublicBook[] = [
  pb({
    id: "1",
    title: "Kindred",
    author: "Octavia E. Butler",
    genre: "Ficção científica",
    status: "lido",
    pages: 288,
    coverUrl: "https://c/1.jpg",
  }),
  pb({
    id: "2",
    title: "Grande Sertão: Veredas",
    author: "João Guimarães Rosa",
    genre: "Romance",
    status: "lendo",
  }),
  pb({
    id: "3",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    genre: "romance",
    status: "lido",
  }),
  pb({
    id: "4",
    title: "Antologia",
    author: null,
    genre: null,
    status: "emprestado",
  }),
];

describe("slug", () => {
  it("normaliza acentos, caixa e pontuação", () => {
    expect(slugify("Ana Júlia Conceição")).toBe("ana-julia-conceicao");
    expect(slugify("  O'Neil #2 — Silva ")).toBe("o-neil-2-silva");
    expect(ownerSlugBase("")).toBe("leitor");
    expect(ownerSlugBase("!!!")).toBe("leitor");
  });
});

describe("recorte público", () => {
  it("monta o caminho com parâmetros em ordem fixa", () => {
    expect(publicPath("ana", EMPTY_SELECTION)).toBe("/estante/ana");
    expect(
      publicPath("ana", { bookId: "9", status: "lido", genre: "romance" })
    ).toBe("/estante/ana?genero=romance&status=lido&livro=9");
  });

  it("imagem OG de um livro ignora gênero e status na URL", () => {
    expect(
      ogImagePath(
        "ana",
        { bookId: "9", status: "lido", genre: "romance" },
        "v1"
      )
    ).toBe("/og/estante/ana?livro=9&v=v1");
    expect(ogImagePath("ana", { status: "lido", genre: "romance" }, "v1")).toBe(
      "/og/estante/ana?genero=romance&status=lido&v=v1"
    );
    expect(ogImagePath("ana", EMPTY_SELECTION, "v1")).toBe(
      "/og/estante/ana?v=v1"
    );
  });

  it("mantém só gênero e livro que existem na estante", () => {
    expect(
      resolvePublicSelection(
        { genre: "romance", status: "lendo", bookId: "1" },
        books
      )
    ).toEqual({
      genre: "romance",
      status: "lendo",
      bookId: "1",
    });
    expect(
      resolvePublicSelection({ genre: "xyz", status: "", bookId: "zz" }, books)
    ).toEqual(EMPTY_SELECTION);
  });

  it("projeção pública descarta doados e campos privados", () => {
    const [b, ...rest] = toPublicBooks([
      makeBook({
        title: "A",
        notes: "segredo",
        borrower: "Carla",
        status: "emprestado",
      }),
      makeBook({ title: "B", status: "doado" }),
    ]);
    expect(rest).toHaveLength(0);
    expect(Object.keys(b).sort()).toEqual([
      "author",
      "coverUrl",
      "genre",
      "id",
      "pages",
      "publisher",
      "status",
      "title",
      "yearPublished",
    ]);
  });

  it("filtra por busca sem acento, gênero e status, ordenando por título", () => {
    expect(
      filterPublicBooks(books, { q: "sertao", genre: "", status: "" }).map(
        (b) => b.id
      )
    ).toEqual(["2"]);
    expect(
      filterPublicBooks(books, { q: "", genre: "romance", status: "" }).map(
        (b) => b.id
      )
    ).toEqual(["3", "2"]);
    expect(
      filterPublicBooks(books, { q: "", genre: "romance", status: "lido" }).map(
        (b) => b.id
      )
    ).toEqual(["3"]);
  });

  it("escreve o aviso do recorte compartilhado", () => {
    expect(
      sharedNotice("Ana Júlia", { ...EMPTY_SELECTION, genre: "romance" }, books)
    ).toBe(
      "Ana compartilhou os livros de Romance. Mude os filtros à vontade para ver o resto."
    );
    expect(
      sharedNotice("Ana", { ...EMPTY_SELECTION, status: "lendo" }, books)
    ).toBe(
      "Ana compartilhou o que está lendo agora. Mude os filtros à vontade para ver o resto."
    );
    expect(
      sharedNotice(
        "Ana",
        { genre: "romance", status: "lido", bookId: "" },
        books
      )
    ).toBe(
      "Ana compartilhou os livros de Romance (livros lidos). Mude os filtros à vontade para ver o resto."
    );
    expect(
      sharedNotice("Ana", { ...EMPTY_SELECTION, bookId: "1" }, books)
    ).toBe(
      "Ana compartilhou “Kindred” com você. O restante da estante está logo abaixo."
    );
    expect(sharedNotice("Ana", EMPTY_SELECTION, books)).toBe("");
  });
});

describe("open graph", () => {
  it("estante toda", () => {
    const og = ogFor(books, "Ana Júlia", EMPTY_SELECTION);
    expect(og.title).toBe("Estante de Ana Júlia");
    expect(og.description).toBe(
      "4 livros catalogados. Veja a estante, filtre por gênero e sorteie sua próxima leitura."
    );
    expect(og).toMatchObject({
      variant: "shelf",
      eyebrow: "A estante de",
      headline: "Ana Júlia",
      accent: "Toda a estante",
      foot: "4 livros",
    });
    // Capas primeiro, depois por título.
    expect(og.covers.map((c) => c.title)[0]).toBe("Kindred");
  });

  it("gênero, status, singular e milhar", () => {
    expect(
      ogFor(books, "Ana", { ...EMPTY_SELECTION, genre: "romance" }).title
    ).toBe("Romance na estante de Ana");
    const lendo = ogFor(books, "Ana", { ...EMPTY_SELECTION, status: "lendo" });
    expect(lendo.title).toBe("Lendo agora na estante de Ana");
    expect(lendo.description).toBe(
      "1 livro nesta seleção. Veja a estante, filtre por gênero e sorteie sua próxima leitura."
    );
    const many = Array.from({ length: 1234 }, (_, i) =>
      pb({ id: "m" + i, title: "L" + i })
    );
    expect(ogFor(many, "Ana", EMPTY_SELECTION).foot).toBe("1.234 livros");
    expect(ogFor(many, "Ana", EMPTY_SELECTION).covers).toHaveLength(5);
  });

  it("livro, com e sem autor", () => {
    const og = ogFor(books, "Ana Júlia Conceição", {
      ...EMPTY_SELECTION,
      bookId: "1",
    });
    expect(og.title).toBe("Kindred, de Octavia E. Butler · na estante de Ana");
    expect(og.description).toBe(
      "Veja a ficha deste livro e o restante da estante de Ana Júlia Conceição na Bodega Literária."
    );
    expect(og).toMatchObject({
      variant: "book",
      eyebrow: "Da estante de Ana Júlia Conceição",
      foot: "Ficção científica · 288 páginas",
    });
    expect(ogFor(books, "Ana", { ...EMPTY_SELECTION, bookId: "4" }).title).toBe(
      "Antologia · na estante de Ana"
    );
  });

  it("versão muda com contagem, alteração e nome", () => {
    const v = ogVersion(3, "2026-01-01T00:00:00.000Z", "Ana");
    expect(ogVersion(4, "2026-01-01T00:00:00.000Z", "Ana")).not.toBe(v);
    expect(ogVersion(3, "2026-01-02T00:00:00.000Z", "Ana")).not.toBe(v);
    expect(ogVersion(3, "2026-01-01T00:00:00.000Z", "Bia")).not.toBe(v);
  });
});

describe("destinos e escopo", () => {
  it("codifica texto e URL em cada rede", () => {
    const og = ogFor(books, "Ana", EMPTY_SELECTION);
    const url = "https://bodega.app/estante/ana?genero=romance&status=lido";
    const t = Object.fromEntries(
      shareTargets(url, og).map((x) => [x.label, x.href])
    );
    expect(Object.keys(t)).toEqual([
      "WhatsApp",
      "X",
      "Facebook",
      "Threads",
      "Telegram",
      "E-mail",
    ]);
    const e = encodeURIComponent;
    expect(t.WhatsApp).toBe(
      "https://wa.me/?text=" + e("Estante de Ana " + url)
    );
    expect(t.X).toBe(
      "https://x.com/intent/post?text=" + e("Estante de Ana") + "&url=" + e(url)
    );
    expect(t.Facebook).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=" + e(url)
    );
    expect(t.Threads).toBe(
      "https://www.threads.net/intent/post?text=" + e("Estante de Ana " + url)
    );
    expect(t.Telegram).toBe(
      "https://t.me/share/url?url=" + e(url) + "&text=" + e("Estante de Ana")
    );
    expect(t["E-mail"]).toBe(
      "mailto:?subject=" +
        e("Estante de Ana") +
        "&body=" +
        e(og.description + "\n\n" + url)
    );
  });

  it("deriva o escopo do chip e da faceta da Estante", () => {
    expect(scopeFromShelf({ status: "lendo", facet: null }, books)).toEqual({
      kind: "status",
      status: "lendo",
    });
    expect(
      scopeFromShelf(
        { status: "todos", facet: { kind: "genero", value: "Romance" } },
        books
      )
    ).toEqual({
      kind: "genero",
      genre: "romance",
    });
    expect(scopeFromShelf({ status: "fav", facet: null }, books)).toEqual({
      kind: "todos",
    });
    expect(
      scopeFromShelf({ status: "emprestado", facet: null }, books)
    ).toEqual({ kind: "todos" });
    expect(
      scopeFromShelf(
        { status: "todos", facet: { kind: "autor", value: "X" } },
        books
      )
    ).toEqual({ kind: "todos" });
    expect(
      scopeFromShelf(
        { status: "todos", facet: { kind: "genero", value: "Não informado" } },
        books
      )
    ).toEqual({
      kind: "todos",
    });
  });

  it("o recorte considera só o campo do escopo ativo", () => {
    expect(
      selectionOf({
        kind: "status",
        status: "lido",
        genre: "romance",
        bookId: "1",
      })
    ).toEqual({
      genre: "",
      status: "lido",
      bookId: "",
    });
  });
});
