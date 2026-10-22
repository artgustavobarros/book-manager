import { describe, expect, it } from "vitest";

import {
  fromLegacyStatus,
  isRead,
  isReading,
  isSituation,
  nextReading,
  READINGS,
  readingInfo,
  readingYearFor,
  SITUATIONS,
  situationInfo,
} from "./book-state";

describe("estado do livro", () => {
  it("tem as 4 Leituras e as 3 Situações na ordem do design", () => {
    expect(READINGS.map((s) => s.k)).toEqual([
      "nao-lido",
      "lendo",
      "lido",
      "abandonado",
    ]);
    expect(SITUATIONS.map((s) => s.k)).toEqual([
      "em-casa",
      "emprestado",
      "doado",
    ]);
  });
  it("cai no padrão para chave desconhecida", () => {
    expect(readingInfo("lido").label).toBe("Lido");
    expect(readingInfo("emprestado").k).toBe("nao-lido");
    expect(situationInfo("doado").label).toBe("Doado");
    expect(situationInfo("xyz").k).toBe("em-casa");
  });
  it("valida chaves", () => {
    expect(isReading("lido")).toBe(true);
    expect(isReading("emprestado")).toBe(false);
    expect(isSituation("emprestado")).toBe(true);
    expect(isSituation("Lido")).toBe(false);
  });
  it("cicla a Leitura corretamente", () => {
    expect(nextReading("nao-lido")).toBe("lendo");
    expect(nextReading("lendo")).toBe("lido");
    expect(nextReading("lido")).toBe("nao-lido");
    expect(nextReading("abandonado")).toBe("nao-lido");
  });
  it("Lido vale pela Leitura, qualquer que seja a Situação", () => {
    expect(isRead({ reading: "lido" })).toBe(true);
    expect(isRead({ reading: "lendo" })).toBe(false);
  });

  it("mantém a mesma regra de ano ao trocar a Leitura na ficha ou na ação rápida", () => {
    expect(readingYearFor(2020, "nao-lido", 2026)).toBeNull();
    expect(readingYearFor(null, "lido", 2026)).toBe(2026);
    expect(readingYearFor(2020, "lido", 2026)).toBe(2020);
    expect(readingYearFor(2020, "abandonado", 2026)).toBe(2020);
  });

  it("separa o status único antigo como a migração do banco", () => {
    expect(fromLegacyStatus("lendo", null)).toEqual({
      reading: "lendo",
      situation: "em-casa",
    });
    expect(fromLegacyStatus("emprestado", 2021)).toEqual({
      reading: "lido",
      situation: "emprestado",
    });
    expect(fromLegacyStatus("doado", null)).toEqual({
      reading: "nao-lido",
      situation: "doado",
    });
    expect(fromLegacyStatus("xyz", null)).toEqual({
      reading: "nao-lido",
      situation: "em-casa",
    });
  });
});
