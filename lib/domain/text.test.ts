import { describe, expect, it } from "vitest";

import { cmp, fmtDate, initial, nf, norm } from "./text";

describe("norm", () => {
  it("remove acentos, pontuação e caixa", () => {
    expect(norm("Grande Sertão: Veredas")).toBe("grande sertao veredas");
    expect(norm("  Nº #12 ")).toBe("n #12");
    expect(norm(null)).toBe("");
  });
});

describe("cmp", () => {
  it("ordena em pt-BR ignorando acentos e caixa", () => {
    expect(["Ópera", "abacate", "Ensaio"].sort(cmp)).toEqual(["abacate", "Ensaio", "Ópera"]);
    expect(cmp("ação", "Acao")).toBe(0);
    expect(cmp(null, "a")).toBeLessThan(0);
  });
});

describe("initial", () => {
  it("ignora artigos iniciais", () => {
    expect(initial("O cortiço")).toBe("C");
    expect(initial("as meninas")).toBe("M");
    expect(initial("The Road")).toBe("R");
    expect(initial("1984")).toBe("1");
    expect(initial("")).toBe("?");
  });
});

describe("fmtDate", () => {
  it("formata como no standalone", () => {
    expect(fmtDate("2023-04-12")).toBe("12 abr 2023");
    expect(fmtDate("")).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
  });
});

describe("nf", () => {
  it("usa separador de milhar pt-BR", () => {
    expect(nf(12345)).toBe("12.345");
  });
});
