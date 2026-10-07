import { describe, expect, it } from "vitest";

import { cmp, fmtDate, initial, lentDurationLabel, nf, norm } from "./text";

describe("norm", () => {
  it("remove acentos, pontuação e caixa", () => {
    expect(norm("Grande Sertão: Veredas")).toBe("grande sertao veredas");
    expect(norm("  Nº #12 ")).toBe("n #12");
    expect(norm(null)).toBe("");
  });
});

describe("cmp", () => {
  it("ordena em pt-BR ignorando acentos e caixa", () => {
    expect(["Ópera", "abacate", "Ensaio"].sort(cmp)).toEqual([
      "abacate",
      "Ensaio",
      "Ópera",
    ]);
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
    expect(nf(12_345)).toBe("12.345");
  });
});

describe("lentDurationLabel", () => {
  const base = new Date("2026-06-15T12:00:00Z");

  it("calcula durações em dias e meses", () => {
    expect(lentDurationLabel("2026-06-15", base)).toBe("hoje");
    expect(lentDurationLabel("2026-06-14", base)).toBe("há 1 dia");
    expect(lentDurationLabel("2026-06-05", base)).toBe("há 10 dias");
    expect(lentDurationLabel("2026-05-15", base)).toBe("há 1 mês");
    expect(lentDurationLabel("2026-03-15", base)).toBe("há 3 meses");
  });

  it("retorna null para datas nulas ou inválidas", () => {
    expect(lentDurationLabel(null, base)).toBeNull();
    expect(lentDurationLabel("data-invalida", base)).toBeNull();
  });
});
