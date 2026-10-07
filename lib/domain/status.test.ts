import { describe, expect, it } from "vitest";

import { isBookStatus, nextReadingStatus, STATUS, stat } from "./status";

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
});
