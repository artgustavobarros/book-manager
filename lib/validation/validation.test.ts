import { describe, expect, it } from "vitest";

import { MIN_PASSWORD, safeCallback, signUpSchema } from "./auth";
import {
  bookBatchSchema,
  bookCreateSchema,
  bookFormSchema,
  bookPatchSchema,
} from "./book";

const form = {
  orderNo: "",
  title: "  Torto arado ",
  author: "Itamar Vieira Junior",
  authorGender: "",
  authorEthnicity: "",
  nationality: "brasileira",
  publisher: "",
  genre: "Romance",
  yearPublished: "2019",
  pages: "264",
  acquiredOn: "2022-02-11",
  reading: "lido" as const,
  situation: "em-casa" as const,
  borrower: "Ana",
  yearRead: "",
  notes: "",
  coverUrl: "",
};

describe("bookFormSchema", () => {
  it("converte strings do formulário para os tipos da API", () => {
    const out = bookFormSchema.parse(form);
    expect(out).toMatchObject({
      title: "Torto arado",
      orderNo: null,
      pages: 264,
      yearPublished: 2019,
      authorGender: null,
      publisher: null,
      borrower: null,
    });
    expect(bookCreateSchema.safeParse(out).success).toBe(true);
  });
  it("valida números e links", () => {
    const r = bookFormSchema.safeParse({
      ...form,
      pages: "12a",
      coverUrl: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
    const msgs = r.error!.issues.map((i) => i.message);
    expect(msgs).toContain("Páginas: informe um número inteiro.");
    expect(msgs).toContain("Use um link http(s) para a capa.");
    expect(bookFormSchema.safeParse({ ...form, title: "  " }).success).toBe(
      false
    );
  });
});

describe("API", () => {
  it("rejeita inteiros inválidos e título vazio", () => {
    expect(bookCreateSchema.safeParse({ title: "" }).success).toBe(false);
    expect(bookCreateSchema.safeParse({ title: "A", pages: 0 }).success).toBe(
      false
    );
    expect(bookCreateSchema.safeParse({ title: "A", pages: 3.5 }).success).toBe(
      false
    );
    expect(bookCreateSchema.parse({ title: "A" })).toEqual({ title: "A" });
  });
  it("patch e lote", () => {
    expect(bookPatchSchema.safeParse({}).success).toBe(false);
    expect(bookPatchSchema.parse({ reading: "lendo" })).toEqual({
      reading: "lendo",
    });
    expect(bookPatchSchema.safeParse({ reading: "emprestado" }).success).toBe(
      false
    );
    expect(bookPatchSchema.safeParse({ status: "lido" }).success).toBe(false);
    expect(
      bookBatchSchema.safeParse([{ id: "x", coverUrl: "https://a" }]).success
    ).toBe(false);
    expect(
      bookBatchSchema.safeParse([
        { id: "6f1c1a5e-8b7d-4c1a-9f7e-2b3c4d5e6f70", coverUrl: "https://a" },
      ]).success
    ).toBe(true);
  });

  it("rejeita datas de aquisição que o calendário não contém", () => {
    expect(
      bookCreateSchema.safeParse({ title: "A", acquiredOn: "2024-02-31" })
        .success
    ).toBe(false);
    expect(
      bookFormSchema.safeParse({ ...form, acquiredOn: "2024-02-31" }).success
    ).toBe(false);
    expect(
      bookPatchSchema.safeParse({ acquiredOn: "2024-02-29" }).success
    ).toBe(true);
  });
});

describe("auth", () => {
  it("aceita senhas a partir do tamanho mínimo", () => {
    const base = { name: "Ana", email: "ana@x.com" };
    const validPassword = "a".repeat(MIN_PASSWORD);
    const shortPassword = "a".repeat(MIN_PASSWORD - 1);

    expect(
      signUpSchema.safeParse({
        ...base,
        password: validPassword,
        confirm: validPassword,
      }).success
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        ...base,
        password: shortPassword,
        confirm: shortPassword,
      }).success
    ).toBe(false);
  });

  it("confere a confirmação de senha", () => {
    const r = signUpSchema.safeParse({
      name: "Ana",
      email: "ANA@x.com ",
      password: "12345678",
      confirm: "1234567",
    });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(["confirm"]);
    expect(
      signUpSchema.parse({
        name: "Ana",
        email: " ANA@x.com",
        password: "12345678",
        confirm: "12345678",
      }).email
    ).toBe("ana@x.com");
  });
});

describe("safeCallback", () => {
  it("aceita caminhos internos", () => {
    expect(safeCallback("/estante?status=lido")).toBe("/estante?status=lido");
    expect(safeCallback("/")).toBe("/");
  });

  it("recusa destinos externos ou ambíguos", () => {
    for (const v of [
      undefined,
      "",
      "estante",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "/a\\b",
      "/\tevil.com",
      "/x\ny",
      "https://evil.com",
    ]) {
      expect(safeCallback(v)).toBe("/");
    }
  });
});
