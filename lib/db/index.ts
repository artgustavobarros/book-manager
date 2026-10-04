import { attachDatabasePool } from "@vercel/functions";
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";

import { env } from "@/env";

import { openPglite } from "./pglite";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

/**
 * - `postgres://…` → node-postgres com pool (Neon em produção, URL "pooled").
 * - `pglite://memory` ou `pglite://<pasta>` → Postgres embutido (dev e testes).
 *
 * Os dois drivers expõem a mesma API do Drizzle (incluindo transações), então o
 * resto do app só conhece o tipo `DB`.
 */
export function createDb(url: string): { db: DB; close: () => Promise<void> } {
  if (url.startsWith("pglite://")) {
    const client = openPglite(url);
    const db = drizzlePglite(client, { schema });
    return { db: db as unknown as DB, close: () => client.close() };
  }

  const pool = new Pool({ connectionString: url, max: 5 });
  // Fecha conexões ociosas antes de a função ser suspensa (Vercel Fluid compute).
  attachDatabasePool(pool);
  const db = drizzlePg(pool, { schema });
  return { db, close: () => pool.end() };
}

const globalForDb = globalThis as unknown as {
  __bodegaDb?: { db: DB; close: () => Promise<void> };
};

/** Instância única por processo, criada no primeiro uso (não durante o build). */
export function getDb(): DB {
  globalForDb.__bodegaDb ??= createDb(env.DATABASE_URL);
  return globalForDb.__bodegaDb.db;
}

/** Proxy preguiçoso: `db.select()…` abre a conexão só na primeira consulta. */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
