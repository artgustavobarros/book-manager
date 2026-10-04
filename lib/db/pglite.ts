import { mkdirSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";

/** Abre um PGlite a partir de `pglite://memory` ou `pglite://<pasta>`. */
export function openPglite(url: string): PGlite {
  const target = url.slice("pglite://".length);
  if (target === "memory") {
    return new PGlite();
  }
  mkdirSync(target, { recursive: true });
  return new PGlite(target);
}
