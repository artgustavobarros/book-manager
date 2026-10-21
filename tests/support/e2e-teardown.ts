import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname } from "node:path";

export default async function teardown() {
  const runDir = process.env.BOOK_MANAGER_E2E_RUN_DIR;
  if (!runDir) {
    return;
  }
  if (
    dirname(runDir) !== tmpdir() ||
    !/^book-manager-e2e-[0-9a-f-]{36}$/.test(basename(runDir))
  ) {
    throw new Error("Diretório temporário E2E inválido; limpeza cancelada.");
  }
  await rm(runDir, { recursive: true, force: true });
}
