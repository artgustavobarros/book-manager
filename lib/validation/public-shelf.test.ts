import { describe, expect, it } from "vitest";

import { isPublicSlug, readPublicParams } from "./public-shelf";

const ID = "3f6c1d2e-8a4b-4c5d-9e0f-1a2b3c4d5e6f";
const read = (o: Record<string, string>) =>
  readPublicParams(new URLSearchParams(o));

describe("endereço da estante pública", () => {
  it("aceita só slugs no formato gerado", () => {
    expect(isPublicSlug("ana-julia-conceicao-2")).toBe(true);
    for (const bad of [
      "",
      "Ana",
      "ana--lima",
      "-ana",
      "ana_lima",
      "ana lima",
      "a".repeat(121),
    ]) {
      expect(isPublicSlug(bad), bad).toBe(false);
    }
  });

  it("lê os parâmetros bem formados", () => {
    expect(
      read({ genero: "ficcao-cientifica", leitura: "lido", livro: ID })
    ).toEqual({
      genre: "ficcao-cientifica",
      reading: "lido",
      bookId: ID,
    });
  });

  it("descarta valores fora do formato sem falhar", () => {
    expect(read({ genero: "Romance!", leitura: "doado", livro: "1" })).toEqual({
      genre: "",
      reading: "",
      bookId: "",
    });
    expect(read({})).toEqual({ genre: "", reading: "", bookId: "" });
    // Links antigos com ?status= deixam de filtrar (ADR 0001).
    expect(read({ status: "lido" })).toEqual({
      genre: "",
      reading: "",
      bookId: "",
    });
  });
});
