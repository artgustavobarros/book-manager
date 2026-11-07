/**
 * Regressão do achado 4 da auditoria (run-1).
 *
 * O sync da planilha não tinha teto de linhas (o import de backup tem: 20.000)
 * e os campos de texto do merge não passavam pelo `bookFieldsSchema`, então a
 * planilha era a única porta de escrita sem limite de tamanho de campo. O
 * único bound era 5 MiB de CSV, conferido depois de ler o corpo inteiro.
 *
 * Os testes guardam os quatro limites e o caminho feliz.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import type { DB } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { SheetError } from "@/lib/domain/sheet";
import { syncSheet } from "@/lib/services/sheet-sync";
import { MAX_BULK_BOOKS } from "@/lib/validation/api";

import { setupTestDb } from "../../support/db";
import { createUserSession } from "../../support/session";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/planilha-de-teste/edit";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});

/** Devolve o CSV sem tocar na rede. */
function csvFetcher(csv: string): typeof fetch {
  return (async () =>
    new Response(csv, {
      status: 200,
      headers: { "content-type": "text/csv" },
    })) as typeof fetch;
}

function sheetOf(titles: string[]) {
  return ["Título", ...titles].join("\n");
}

function titles(count: number, prefix = "Livro") {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i}`);
}

async function countBooks(userId: string) {
  return (await db.select().from(books).where(eq(books.userId, userId))).length;
}

/** Roda o sync e devolve o SheetError, falhando se não houver erro. */
async function syncExpectingError(
  userId: string,
  csv: string
): Promise<SheetError> {
  const result = await syncSheet(db, userId, SHEET_URL, {
    fetcher: csvFetcher(csv),
  }).then(
    () => null,
    (error: unknown) => error
  );
  if (!(result instanceof SheetError)) {
    throw new Error(`esperava SheetError, veio ${String(result)}`);
  }
  return result;
}

describe("achado 4 — limites do sync da planilha", () => {
  it("recusa planilha acima do teto de linhas sem gravar nada", async () => {
    const { userId } = await createUserSession("Dona Linhas");

    const error = await syncExpectingError(
      userId,
      sheetOf(titles(MAX_BULK_BOOKS + 1))
    );

    expect(error.code).toBe("too-many-rows");
    expect(error.detail).toContain("20.001");
    expect(await countBooks(userId)).toBe(0);
  });

  it("recusa texto acima do limite do modelo sem gravar nada", async () => {
    const { userId } = await createUserSession("Dona Texto");

    const error = await syncExpectingError(
      userId,
      sheetOf(["A".repeat(40_000)])
    );

    expect(error.code).toBe("invalid-row");
    expect(error.detail).toContain("Linha 1");
    expect(await countBooks(userId)).toBe(0);
  });

  it("recusa quando o total do usuário passaria do teto", {
    timeout: 300_000,
  }, async () => {
    const { userId } = await createUserSession("Dona Total");

    // Enche a estante até o teto; isso é permitido.
    await syncSheet(db, userId, SHEET_URL, {
      fetcher: csvFetcher(sheetOf(titles(MAX_BULK_BOOKS))),
    });
    expect(await countBooks(userId)).toBe(MAX_BULK_BOOKS);

    // Um único livro novo já passa do teto.
    const error = await syncExpectingError(
      userId,
      sheetOf(["Livro que não cabe"])
    );

    expect(error.code).toBe("too-many-books");
    expect(await countBooks(userId)).toBe(MAX_BULK_BOOKS);
  });

  it("aborta o download acima de 5 MiB em vez de ler tudo primeiro", async () => {
    const { userId } = await createUserSession("Dona Bytes");

    const error = await syncExpectingError(
      userId,
      sheetOf(["A".repeat(6 * 1024 * 1024)])
    );

    expect(error.code).toBe("fetch");
    expect(await countBooks(userId)).toBe(0);
  });

  it("uma planilha normal continua sincronizando", async () => {
    const { userId } = await createUserSession("Dona Normal");

    const result = await syncSheet(db, userId, SHEET_URL, {
      fetcher: csvFetcher(sheetOf(["Dom Casmurro", "Grande Sertão: Veredas"])),
    });

    expect(result).toEqual({ updated: 0, added: 2 });
    expect(await countBooks(userId)).toBe(2);
  });
});
