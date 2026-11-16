import { describe, expect, it } from "vitest";

import {
  PHOTO_MODELS,
  photoModelSchema,
  photoReadingSchema,
  photoSearchQuery,
  validPhotoIsbn,
} from "./book-photo";

describe("pistas da foto", () => {
  it("permite apenas o Nemotron gratuito", () => {
    for (const model of PHOTO_MODELS) {
      expect(photoModelSchema.parse(model.value)).toBe(model.value);
    }
    expect(photoModelSchema.safeParse("openai/gpt-5").success).toBe(false);
    expect(
      photoModelSchema.safeParse("google/gemma-4-31b-it:free").success
    ).toBe(false);
  });

  it("valida e normaliza o checksum de ISBN-10 e ISBN-13", () => {
    expect(validPhotoIsbn("978-85-359-0277-8")).toBe("9788535902778");
    expect(validPhotoIsbn("85 359 0277 5")).toBe("8535902775");
    expect(validPhotoIsbn("0-8044-2957-X")).toBe("080442957X");
    expect(validPhotoIsbn("9788535902779")).toBeNull();
    expect(validPhotoIsbn("1234567890128")).toBeNull();
    expect(validPhotoIsbn(null)).toBeNull();
  });

  it("prioriza ISBN válido e usa título/autor quando o ISBN é inválido", () => {
    const reading = {
      title: "Torto arado",
      author: "Itamar Vieira Junior",
      isbn: null,
    };
    expect(photoSearchQuery(reading)).toBe("Torto arado Itamar Vieira Junior");
    expect(photoSearchQuery({ ...reading, isbn: "9788535902778" })).toBe(
      "9788535902778"
    );
    expect(photoSearchQuery({ ...reading, isbn: "9788535902779" })).toBe(
      "Torto arado Itamar Vieira Junior"
    );
    expect(photoSearchQuery({ title: null, author: "Autor", isbn: null })).toBe(
      ""
    );
  });

  it("aceita leitura vazia, mas recusa campos ausentes ou texto excessivo", () => {
    expect(
      photoReadingSchema.parse({ title: null, author: null, isbn: null })
    ).toEqual({ title: null, author: null, isbn: null });
    expect(photoReadingSchema.safeParse({ title: "X" }).success).toBe(false);
    expect(
      photoReadingSchema.safeParse({
        title: "X".repeat(501),
        author: null,
        isbn: null,
      }).success
    ).toBe(false);
  });
});
