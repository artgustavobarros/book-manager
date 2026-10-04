import path from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";

import { openPglite } from "./pglite";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** Aplica as migrations versionadas em `drizzle/` no banco indicado pela URL. */
export async function runMigrations(
  url: string,
  client?: PGlite
): Promise<void> {
  if (url.startsWith("pglite://")) {
    const pg = client ?? openPglite(url);
    await migratePglite(drizzlePglite(pg), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    if (!client) {
      await pg.close();
    }
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migratePg(drizzlePg(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
