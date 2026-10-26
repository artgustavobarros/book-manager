import { describe, expect, it } from "vitest";

import { makeBook } from "@/tests/support/reference";

import { exportCsv, parseCSV } from "./csv";

describe("parseCSV", () => {
  it("detecta o separador e lida com aspas, BOM e CRLF", () => {
    expect(parseCSV('﻿Título;Autor\r\n"A; B";"Diz ""oi"""\r\nC;D')).toEqual([
      ["Título", "Autor"],
      ["A; B", 'Diz "oi"'],
      ["C", "D"],
    ]);
    expect(parseCSV("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("aceita quebra de linha dentro de aspas e ignora linhas vazias", () => {
    expect(parseCSV('t;n\n"x";"linha 1\nlinha 2"\n;\n\n')).toEqual([
      ["t", "n"],
      ["x", "linha 1\nlinha 2"],
    ]);
  });
});

describe("exportCsv", () => {
  it("escapa ; e aspas", () => {
    const csv = exportCsv([makeBook({ title: 'Um "dois"; três', orderNo: 1 })]);
    expect(csv.split("\r\n")[1].split(";")[1]).toBe('"Um ""dois""');
  });
});
