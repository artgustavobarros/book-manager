import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { makeBook, referenceBooks } from "@/tests/support/reference";
import { loadStandalone } from "@/tests/support/standalone";

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

  it("é idêntico ao parser do standalone", () => {
    const oracleParse = loadStandaloneParse();
    const samples = [
      'a;b\n"1;2";3',
      'x,y\r\n1,"2,3"\r\n',
      '﻿T;A\n"um ""dois""";3\r\n\r\n;;\n4;5',
    ];
    for (const s of samples) {
      expect(parseCSV(s)).toEqual(oracleParse(s));
    }
  });
});

describe("exportCsv × standalone", () => {
  let captured: Blob | null = null;
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T18:00:00Z"));
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      captured = b as Blob;
      return "blob:x";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });
  afterAll(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gera o mesmo CSV, mais a coluna Cor/etnia", async () => {
    const oracle = loadStandalone();
    (oracle as any).toast = () => {};
    (oracle as any).exportCsv();
    const theirs = await captured!.text();
    const ours = exportCsv(referenceBooks());
    const dropEthnicity = (csv: string) =>
      csv
        .split("\r\n")
        .map((line) => {
          const cells = parseCSV(line)[0] ?? [];
          return cells.length === 16
            ? line.split(";").toSpliced(11, 1).join(";")
            : line;
        })
        .join("\r\n");
    expect(ours.startsWith("﻿")).toBe(true);
    expect(dropEthnicity(ours.slice(1))).toBe(theirs.replace(/^﻿/, ""));
  });

  it("escapa ; e aspas", () => {
    const csv = exportCsv([makeBook({ title: 'Um "dois"; três', orderNo: 1 })]);
    expect(csv.split("\r\n")[1].split(";")[1]).toBe('"Um ""dois""');
  });
});

function loadStandaloneParse(): (s: string) => string[][] {
  const src = readFileSync("design/handoff/source/Acervo.dc.html", "utf8");
  const start = src.indexOf("function parseCSV");
  const end = src.indexOf("function mapHeader");
  return new Function(src.slice(start, end) + "\nreturn parseCSV;")();
}
