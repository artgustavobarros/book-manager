/** CSV: parser da planilha (porta de `parseCSV`) e exportação "Exportar Excel (CSV)". */
import { stat } from "./status";
import type { Book } from "./types";

/**
 * Lê CSV com separador `;` ou `,` (o que aparecer mais na primeira linha), aspas com
 * escape `""`, BOM e quebras CRLF/LF/CR. Linhas totalmente vazias são descartadas.
 */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] || "";
  const d = first.split(";").length > first.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === d) {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

type Column = readonly [header: string, value: (b: Book) => string | number | null];

const brDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

export const CSV_COLUMNS: readonly Column[] = [
  ["Ordem", (b) => b.orderNo],
  ["Título", (b) => b.title],
  ["Autor(a)", (b) => b.author],
  ["Editora", (b) => b.publisher],
  ["Status", (b) => stat(b.status).label],
  ["Emprestado para", (b) => b.borrower],
  ["Gênero da obra", (b) => b.genre],
  ["Páginas", (b) => b.pages],
  ["Ano em que foi lido", (b) => b.yearRead],
  ["Nacionalidade", (b) => b.nationality],
  ["Gênero do autor(a)", (b) => b.authorGender],
  ["Cor/etnia do autor(a)", (b) => b.authorEthnicity],
  ["Ano de lançamento", (b) => b.yearPublished],
  ["Data de aquisição", (b) => brDate(b.acquiredOn)],
  ["Capa", (b) => b.coverUrl],
  ["Anotações", (b) => b.notes],
];

function esc(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** CSV para Excel: `;`, CRLF, BOM UTF-8, ordenado pelo nº de ordem. */
export function exportCsv(books: readonly Book[]): string {
  const ordN = (b: Book) => b.orderNo || 1e9;
  const lines = [
    CSV_COLUMNS.map((c) => c[0]).join(";"),
    ...[...books].sort((a, b) => ordN(a) - ordN(b)).map((b) => CSV_COLUMNS.map(([, get]) => esc(get(b))).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

/** Nome de arquivo com a data local: acervo-AAAA-MM-DD.<ext> (como no standalone). */
export function exportFileName(ext: "csv" | "json", now: Date = new Date()): string {
  return "acervo-" + now.toISOString().slice(0, 10) + "." + ext;
}
