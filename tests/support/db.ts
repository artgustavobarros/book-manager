import { readFile, rm } from "node:fs/promises";

import { drizzle } from "drizzle-orm/pglite";

import type { DB } from "@/lib/db";
import { runMigrations } from "@/lib/db/migrate";
import { openPglite } from "@/lib/db/pglite";
import * as schema from "@/lib/db/schema";
import { OUTBOX_FILE } from "@/lib/email";

/**
 * Banco PGlite em memória, migrado, instalado como o `db` do app (lib/db usa
 * `globalThis.__bodegaDb`). Chame no `beforeAll` dos testes de integração.
 */
export async function setupTestDb(): Promise<DB> {
  const client = openPglite("pglite://memory");
  await runMigrations("pglite://memory", client);
  const db = drizzle(client, { schema }) as unknown as DB;
  (globalThis as { __bodegaDb?: unknown }).__bodegaDb = { db, close: () => client.close() };
  return db;
}

export async function clearOutbox() {
  await rm(OUTBOX_FILE, { force: true });
}

/** Espera um e-mail para o destinatário aparecer na caixa de saída de teste. */
export async function waitForEmail(to: string, timeoutMs = 3000): Promise<{ subject: string; text: string; html: string }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const content = await readFile(OUTBOX_FILE, "utf8").catch(() => "");
    const found = content
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .reverse()
      .find((m) => m.to === to);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`Nenhum e-mail para ${to}`);
}

export function linkFrom(text: string): string {
  const m = text.match(/https?:\/\/\S+/);
  if (!m) throw new Error("Link não encontrado no e-mail");
  return m[0];
}
