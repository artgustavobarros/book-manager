import type { DB } from "@/lib/db";
import { SheetError, isGoogleSheetsUrl, mergeSheet, parseSheet, sheetCsvUrl } from "@/lib/domain/sheet";

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
  const res = await fetcher(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new SheetError("fetch");
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new SheetError("fetch");
  return text;
}

/**
 * Baixa o CSV da planilha (só do Google Sheets), aplica o merge e salva a URL.
 * Devolve as contagens ou lança SheetError.
 */
export async function syncSheet(
  db: DB,
  userId: string,
  sheetUrl: string,
  { fetcher = fetch, now = new Date() }: { fetcher?: typeof fetch; now?: Date } = {},
): Promise<{ updated: number; added: number }> {
  const url = sheetCsvUrl(sheetUrl);
  if (!url || !isGoogleSheetsUrl(url)) throw new SheetError("invalid-url");
  await saveSettings(db, userId, { sheetUrl: sheetUrl.trim() });
  const text = await fetchCsv(url, fetcher);
  const records = parseSheet(text);
  const merge = mergeSheet(await listBooks(db, userId), records, now);
  await applyMerge(db, userId, merge);
  return { updated: merge.updated, added: merge.added };
}
