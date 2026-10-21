import { describe, expect, it } from "vitest";

import {
  isBookStatus,
  isRead,
  nextReadingStatus,
  readingYearForStatus,
  returnStatus,
  STATUS,
  stat,
} from "./status";

describe("status", () => {
  it("tem os 6 status na ordem do design", () => {
    expect(STATUS.map((s) => s.k)).toEqual([
      "nao-lido",
      "lendo",
      "lido",
      "emprestado",
      "abandonado",
      "doado",
    ]);
  });
  it("stat cai em 'Não lido' para chave desconhecida", () => {
    expect(stat("emprestado").label).toBe("Emprestado");
    expect(stat("xyz").k).toBe("nao-lido");
  });
  it("valida chaves", () => {
    expect(isBookStatus("lido")).toBe(true);
    expect(isBookStatus("Lido")).toBe(false);
  });
  it("cicla status de leitura corretamente", () => {
    expect(nextReadingStatus("nao-lido")).toBe("lendo");
    expect(nextReadingStatus("lendo")).toBe("lido");
    expect(nextReadingStatus("lido")).toBe("nao-lido");
    expect(nextReadingStatus("abandonado")).toBe("nao-lido");
    expect(nextReadingStatus("emprestado")).toBe("nao-lido");
  });
  it("conta como lido o emprestado com ano de leitura", () => {
    expect(isRead({ status: "lido", yearRead: null })).toBe(true);
    expect(isRead({ status: "emprestado", yearRead: 2026 })).toBe(true);
    expect(isRead({ status: "emprestado", yearRead: null })).toBe(false);
    expect(isRead({ status: "doado", yearRead: 2024 })).toBe(false);
  });
  it("devolve como lido quem tem ano de leitura", () => {
    expect(returnStatus({ yearRead: 2026 })).toBe("lido");
    expect(returnStatus({ yearRead: null })).toBe("nao-lido");
  });

  it("mantém a mesma regra de ano ao trocar status na ficha ou na ação rápida", () => {
    expect(readingYearForStatus(2020, "nao-lido", 2026)).toBeNull();
    expect(readingYearForStatus(null, "lido", 2026)).toBe(2026);
    expect(readingYearForStatus(2020, "emprestado", 2026)).toBe(2020);
  });
});
