import type { DB } from "@/lib/db";
import type { SheetMerge } from "@/lib/domain/sheet";
import {
  isGoogleSheetsUrl,
  mergeSheet,
  parseSheet,
  SheetError,
  sheetCsvUrl,
} from "@/lib/domain/sheet";
import { readBoundedBody } from "@/lib/outbound-fetch";
import { MAX_BULK_BOOKS } from "@/lib/validation/api";
import { bookFieldsSchema } from "@/lib/validation/book";

import { applyMerge, listBooks } from "./books";
import { saveSettings } from "./settings";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024;

export const SHEET_MESSAGES = {
  invalidUrl: "Link inválido. Use o link de compartilhamento da planilha.",
  unreadable:
    "Não foi possível ler a planilha. Confirme que ela está compartilhada como “Qualquer pessoa com o link” e que a primeira linha tem os nomes das colunas (Título, Autor, Status…).",
} as const;

async function fetchCsv(url: string, fetcher: typeof fetch): Promise<string> {
  const res = await fetcher(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SheetError("fetch");
  }
  // Corta no teto durante o download: medir depois de carregar tudo não é
  // limite, porque nesse ponto a memória já foi gasta.
  const body = await readBoundedBody(res, MAX_BYTES);
  if (!body) {
    throw new SheetError("fetch");
  }
  return new TextDecoder().decode(body);
}

/**
 * O merge montava os campos com `toText`, que só apara espaços, e escrevia
 * direto no banco — as colunas são `text` sem limite. Resultado: a planilha
 * era a única porta de escrita que não passava pelo `bookFieldsSchema`, então
 * dava para gravar um título de 40 mil caracteres que nenhuma outra rota
 * aceitaria. Aqui inserções e atualizações passam pelo mesmo esquema do resto
 * do app, e a primeira violação derruba a sincronização inteira em vez de
 * aparar o valor em silêncio.
 */
function validateMerge(merge: SheetMerge): SheetMerge {
  merge.inserts.forEach((fields, i) => {
    const parsed = bookFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new SheetError(
        "invalid-row",
        `Linha ${i + 1} da planilha (“${String(fields.title).slice(0, 60)}”): ${issue.message}`
      );
    }
  });
  for (const update of merge.updates) {
    const parsed = bookFieldsSchema.partial().safeParse(update.fields);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new SheetError(
        "invalid-row",
        `Um livro já cadastrado receberia um valor inválido da planilha: ${issue.message}`
      );
    }
  }
  return merge;
}

/**
 * Baixa o CSV da planilha (só do Google Sheets), aplica o merge e salva a URL.
 * Devolve as contagens ou lança SheetError.
 */
export async function syncSheet(
  db: DB,
  userId: string,
  sheetUrl: string,
  {
    fetcher = fetch,
    now = new Date(),
  }: { fetcher?: typeof fetch; now?: Date } = {}
): Promise<{ updated: number; added: number }> {
  const url = sheetCsvUrl(sheetUrl);
  if (!(url && isGoogleSheetsUrl(url))) {
    throw new SheetError("invalid-url");
  }
  await saveSettings(db, userId, { sheetUrl: sheetUrl.trim() });
  const text = await fetchCsv(url, fetcher);
  const records = parseSheet(text);
  if (records.length > MAX_BULK_BOOKS) {
    throw new SheetError(
      "too-many-rows",
      `A planilha tem ${records.length.toLocaleString("pt-BR")} linhas com título e o limite é ${MAX_BULK_BOOKS.toLocaleString("pt-BR")}. Nada foi gravado.`
    );
  }
  const existing = await listBooks(db, userId);
  const merge = validateMerge(mergeSheet(existing, records, now));
  const total = existing.length + merge.inserts.length;
  if (total > MAX_BULK_BOOKS) {
    throw new SheetError(
      "too-many-books",
      `Esta sincronização deixaria sua estante com ${total.toLocaleString("pt-BR")} livros e o limite é ${MAX_BULK_BOOKS.toLocaleString("pt-BR")}. Nada foi gravado.`
    );
  }
  await applyMerge(db, userId, merge);
  return { updated: merge.updated, added: merge.added };
}
