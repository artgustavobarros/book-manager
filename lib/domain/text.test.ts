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
  const SP = "America/Sao_Paulo";
  const base = new Date("2026-06-15T12:00:00Z");

  it("calcula durações em dias e meses", () => {
    expect(lentDurationLabel("2026-06-15", base, SP)).toBe("hoje");
    expect(lentDurationLabel("2026-06-14", base, SP)).toBe("há 1 dia");
    expect(lentDurationLabel("2026-06-05", base, SP)).toBe("há 10 dias");
    expect(lentDurationLabel("2026-05-15", base, SP)).toBe("há 1 mês");
    expect(lentDurationLabel("2026-03-15", base, SP)).toBe("há 3 meses");
  });

  it("conta dias de calendário no fuso, não blocos de 24 h", () => {
    const nineAm = new Date("2026-06-15T09:00:00-03:00");
    // 22h de ontem: 11 h atrás, mas já é outro dia em Brasília.
    expect(lentDurationLabel("2026-06-14T22:00:00-03:00", nineAm, SP)).toBe(
      "há 1 dia"
    );
    expect(lentDurationLabel("2026-06-15T00:01:00-03:00", nineAm, SP)).toBe(
      "hoje"
    );
    const lateNight = new Date("2026-06-15T23:59:00-03:00");
    expect(lentDurationLabel("2026-06-15T00:01:00-03:00", lateNight, SP)).toBe(
      "hoje"
    );
    // 23h59 → 00h01: 2 min depois, já é "há 1 dia".
    expect(
      lentDurationLabel(
        "2026-06-15T23:59:00-03:00",
        new Date("2026-06-16T00:01:00-03:00"),
        SP
      )
    ).toBe("há 1 dia");
  });

  it("depende do fuso do usuário", () => {
    // 20h de 14/06 em Brasília = 08h de 15/06 em Tóquio.
    const lent = "2026-06-14T23:00:00Z";
    const now = new Date("2026-06-15T14:00:00Z");
    expect(lentDurationLabel(lent, now, SP)).toBe("há 1 dia");
    expect(lentDurationLabel(lent, now, "Asia/Tokyo")).toBe("hoje");
  });

  it("aceita Date e respeita os limites das faixas", () => {
    const day = (n: number) => new Date(base.getTime() - n * 86_400_000);
    expect(lentDurationLabel(day(0), base, SP)).toBe("hoje");
    expect(lentDurationLabel(day(1), base, SP)).toBe("há 1 dia");
    expect(lentDurationLabel(day(29), base, SP)).toBe("há 29 dias");
    expect(lentDurationLabel(day(30), base, SP)).toBe("há 1 mês");
    expect(lentDurationLabel(day(59), base, SP)).toBe("há 1 mês");
    expect(lentDurationLabel(day(60), base, SP)).toBe("há 2 meses");
  });

  it("trata data futura como hoje", () => {
    expect(lentDurationLabel("2026-06-20T10:00:00Z", base, SP)).toBe("hoje");
  });

  it("retorna null para datas nulas ou inválidas", () => {
    expect(lentDurationLabel(null, base, SP)).toBeNull();
    expect(lentDurationLabel("data-invalida", base, SP)).toBeNull();
    expect(lentDurationLabel("2026-13-40", base, SP)).toBeNull();
  });
});
