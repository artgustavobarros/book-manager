/**
 * Regressão do achado 3 da auditoria (run-1).
 *
 * `GET /api/sheets-export/callback?error=x` desativava o export semanal de
 * quem estivesse logado sem conferir se essa pessoa tinha começado um fluxo de
 * conexão. Como o handler muda estado em GET e se autoriza só pelo cookie de
 * sessão (`SameSite=Lax` viaja em navegação de topo vinda de outro site), um
 * link de fora bastava.
 *
 * A correção limita o cancelamento ao fluxo pendente. Os testes guardam os
 * dois lados: a navegação forjada não derruba nada, e os cancelamentos
 * legítimos continuam funcionando.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import * as callbackRoute from "@/app/api/sheets-export/callback/route";
import * as exportRoute from "@/app/api/sheets-export/route";
import type { DB } from "@/lib/db";
import { sheetExportConnections } from "@/lib/db/schema";

import { setupTestDb } from "../../support/db";
import { createUserSession, ctx, req } from "../../support/session";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});

async function statusOf(userId: string) {
  const [row] = await db
    .select()
    .from(sheetExportConnections)
    .where(eq(sheetExportConnections.userId, userId));
  return row?.status ?? null;
}

describe("achado 3 — callback do export por GET", () => {
  it("GET com ?error não desativa um export ativo sem fluxo pendente", async () => {
    const { cookie, userId } = await createUserSession();
    await db.insert(sheetExportConnections).values({
      userId,
      status: "enabled",
      accountId: null,
      updatedAt: new Date(),
    });
    expect(await statusOf(userId)).toBe("enabled");

    const res = await callbackRoute.GET(
      req("/api/sheets-export/callback?error=access_denied", { cookie }),
      ctx()
    );

    // O redirecionamento em si é esperado; o que não pode é perder a conexão.
    expect(res.status).toBe(307);
    expect(await statusOf(userId)).toBe("enabled");
  });

  it("GET com ?error desativa quando o fluxo estava realmente pendente", async () => {
    const { cookie, userId } = await createUserSession();
    await db.insert(sheetExportConnections).values({
      userId,
      status: "pending",
      accountId: null,
      updatedAt: new Date(),
    });

    await callbackRoute.GET(
      req("/api/sheets-export/callback?error=access_denied", { cookie }),
      ctx()
    );

    expect(await statusOf(userId)).toBe("disabled");
  });

  it("GET sem ?error também não derruba uma conexão ativa sem fluxo pendente", async () => {
    const { cookie, userId } = await createUserSession();
    await db.insert(sheetExportConnections).values({
      userId,
      status: "enabled",
      accountId: null,
      updatedAt: new Date(),
    });

    // Sem `error`, o handler tenta ativar; não havendo fluxo pendente o
    // resultado é "denied", que antes também caía no desativar sem escopo.
    await callbackRoute.GET(
      req("/api/sheets-export/callback", { cookie }),
      ctx()
    );

    expect(await statusOf(userId)).toBe("enabled");
  });

  it("desativar de propósito pelos ajustes continua funcionando", async () => {
    const { cookie, userId } = await createUserSession();
    await db.insert(sheetExportConnections).values({
      userId,
      status: "enabled",
      accountId: null,
      updatedAt: new Date(),
    });

    // POST com corpo JSON: força preflight num pedido cross-site, então não é
    // alcançável por um link de fora como o GET era.
    const res = await exportRoute.POST(
      req("/api/sheets-export", {
        method: "POST",
        cookie,
        json: { action: "disable" },
      }),
      ctx()
    );

    expect(res.status).toBe(200);
    expect(await statusOf(userId)).toBe("disabled");
  });
});
