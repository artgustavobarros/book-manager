import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import * as cronRoute from "@/app/api/cron/sheets-export/route";
import * as exportRoute from "@/app/api/sheets-export/route";
import type { DB } from "@/lib/db";
import {
  account,
  sheetExportConnections,
  sheetExportRuns,
  user,
} from "@/lib/db/schema";
import { sheetWeekKey } from "@/lib/domain/weekly-sheets";
import { createBook } from "@/lib/services/books";
import {
  createOrRecoverSpreadsheet,
  publishWeek,
} from "@/lib/services/google-sheets";
import {
  activateSheetExport,
  disableSheetExport,
  dueSheetExportUsers,
  type ExportDeps,
  runSheetExport,
  sheetExportState,
  startSheetExport,
} from "@/lib/services/sheet-export";
import { DRIVE_FILE_SCOPE } from "@/lib/services/sheet-export-contract";

import { setupTestDb } from "../support/db";
import { createUserSession, ctx, req } from "../support/session";

interface FakeTab {
  properties: {
    sheetId: number;
    title: string;
    hidden: boolean;
    gridProperties: { rowCount: number; columnCount: number };
  };
  rows: Map<number, unknown>;
}

class FakeGoogle {
  files = new Map<string, { id: string; tabs: FakeTab[] }>();
  failNextBatch = false;
  writes = 0;

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (url.pathname === "/drive/v3/files") {
      const name = url.searchParams.get("q")?.match(/name = '([^']+)'/)?.[1];
      const file = this.files.get(name ?? "");
      return json({ files: file ? [{ id: file.id }] : [] });
    }
    if (url.pathname === "/v4/spreadsheets" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const id = `spreadsheet-${this.files.size + 1}`;
      this.files.set(body.properties.title, {
        id,
        tabs: body.sheets.map(
          (
            sheet: { properties: Omit<FakeTab["properties"], "sheetId"> },
            index: number
          ) => ({
            properties: {
              sheetId: index + 1,
              ...sheet.properties,
            },
            rows: new Map(),
          })
        ),
      });
      return json({ spreadsheetId: id });
    }
    const id = url.pathname.split("/").at(-1)?.replace(":batchUpdate", "");
    const file = [...this.files.values()].find((f) => f.id === id);
    if (!file) {
      return json({}, 404);
    }
    if (method === "GET") {
      return json({ sheets: file.tabs });
    }
    if (this.failNextBatch) {
      this.failNextBatch = false;
      return json({}, 503);
    }
    const { requests } = JSON.parse(String(init?.body));
    this.writes++;
    for (const request of requests) {
      if (request.addSheet) {
        file.tabs.push({
          properties: request.addSheet.properties,
          rows: new Map(),
        });
      } else if (request.deleteSheet) {
        file.tabs = file.tabs.filter(
          (tab) => tab.properties.sheetId !== request.deleteSheet.sheetId
        );
      } else if (request.updateSheetProperties) {
        const { properties } = request.updateSheetProperties;
        const tab = file.tabs.find(
          (entry) => entry.properties.sheetId === properties.sheetId
        )!;
        tab.properties = {
          ...tab.properties,
          ...properties,
          gridProperties: {
            ...tab.properties.gridProperties,
            ...properties.gridProperties,
          },
        };
      } else if (request.updateCells) {
        const update = request.updateCells;
        const tab = file.tabs.find(
          (entry) =>
            entry.properties.sheetId ===
            (update.range?.sheetId ?? update.start?.sheetId)
        )!;
        const first =
          update.range?.startRowIndex ?? update.start?.rowIndex ?? 0;
        if (update.range) {
          for (let row = first; row < update.range.endRowIndex; row++) {
            tab.rows.delete(row);
          }
        }
        update.rows.forEach((row: unknown, offset: number) => {
          tab.rows.set(first + offset, row);
        });
      }
    }
    return json({ spreadsheetId: id, replies: requests.map(() => ({})) });
  };
}

let db: DB;
let ana: Awaited<ReturnType<typeof createUserSession>>;
let bia: Awaited<ReturnType<typeof createUserSession>>;
const first = new Date("2026-10-05T06:00:00Z");
const second = new Date("2026-10-12T06:00:00Z");
const third = new Date("2026-10-19T06:00:00Z");

beforeAll(async () => {
  db = await setupTestDb();
  ana = await createUserSession("Ana");
  bia = await createUserSession("Bia");
});

async function grant(userId: string) {
  await startSheetExport(db, userId);
  const id = randomUUID();
  await db.insert(account).values({
    id,
    accountId: randomUUID(),
    providerId: "google",
    userId,
    refreshToken: "test-refresh-token",
    accessToken: "test-access-token",
    scope: DRIVE_FILE_SCOPE,
    updatedAt: new Date(Date.now() + 2000),
  });
  return id;
}

describe("exportação semanal", () => {
  it("reencontra uma planilha criada e publica payload grande só após os lotes", async () => {
    const fake = new FakeGoogle();
    const id = await createOrRecoverSpreadsheet(
      "test-access-token",
      "user-orphan",
      sheetWeekKey(first),
      fake.fetch
    );
    expect(
      await createOrRecoverSpreadsheet(
        "test-access-token",
        "user-orphan",
        sheetWeekKey(first),
        fake.fetch
      )
    ).toBe(id);
    expect(fake.files.size).toBe(1);
    const rows = Array.from({ length: 36 }, () => ({
      values: [{ userEnteredValue: { stringValue: "x".repeat(49_000) } }],
    }));
    await publishWeek(
      id,
      "test-access-token",
      sheetWeekKey(first),
      rows,
      fake.fetch
    );
    const tab = [...fake.files.values()][0].tabs[0];
    expect(tab.properties.title).toBe(sheetWeekKey(first));
    expect(tab.rows.size).toBe(36);
    expect(fake.writes).toBeGreaterThan(2);
  });

  it("cria cópia inicial, preserva semanas e isola os usuários", async () => {
    const fake = new FakeGoogle();
    const deps: ExportDeps = {
      fetcher: fake.fetch,
      getToken: async () => "test-access-token",
      now: first,
    };
    await createBook(db, ana.userId, {
      title: "Só da Ana",
      notes: "=2+2",
      favorite: true,
    });
    await grant(ana.userId);
    expect((await activateSheetExport(db, ana.userId, deps)).status).toBe(
      "enabled"
    );
    const state = await sheetExportState(db, ana.userId, first);
    expect(state.currentWeekSucceeded).toBe(true);
    expect(state.spreadsheetUrl).toContain("spreadsheet-1");
    const file = [...fake.files.values()][0];
    expect(file.tabs.map((tab) => tab.properties.title)).toEqual([
      sheetWeekKey(first),
    ]);
    expect(file.tabs[0].rows.size).toBe(2);
    expect(JSON.stringify(file.tabs[0].rows.get(1))).toContain("=2+2");
    const writes = fake.writes;
    expect(await runSheetExport(db, ana.userId, deps)).toBe(false);
    expect(fake.writes).toBe(writes);

    await grant(bia.userId);
    await activateSheetExport(db, bia.userId, deps);
    expect([...fake.files.values()][1].tabs[0].rows.size).toBe(1);
    expect(
      JSON.stringify([...[...fake.files.values()][1].tabs[0].rows.values()])
    ).not.toContain("Só da Ana");

    expect(await runSheetExport(db, ana.userId, { ...deps, now: second })).toBe(
      true
    );
    expect(file.tabs.map((tab) => tab.properties.title)).toEqual([
      sheetWeekKey(first),
      sheetWeekKey(second),
    ]);
    const simultaneous = await Promise.all([
      runSheetExport(db, ana.userId, { ...deps, now: third }),
      runSheetExport(db, ana.userId, { ...deps, now: third }),
    ]);
    expect(simultaneous.filter(Boolean)).toHaveLength(1);
    expect(file.tabs.map((tab) => tab.properties.title)).toEqual([
      sheetWeekKey(first),
      sheetWeekKey(second),
      sheetWeekKey(third),
    ]);
  });

  it("repete falha temporária e reconcilia escrita remota sem duplicar aba", async () => {
    const fake = new FakeGoogle();
    const session = await createUserSession("Carol");
    await grant(session.userId);
    const deps: ExportDeps = {
      fetcher: fake.fetch,
      getToken: async () => "test-access-token",
      now: first,
    };
    fake.failNextBatch = true;
    await activateSheetExport(db, session.userId, deps);
    expect(
      (await sheetExportState(db, session.userId, first)).lastError
    ).toContain("Google está indisponível");
    expect(await runSheetExport(db, session.userId, deps)).toBe(true);
    const file = [...fake.files.values()][0];
    expect(file.tabs).toHaveLength(1);

    await db
      .update(sheetExportRuns)
      .set({ status: "failed" })
      .where(
        and(
          eq(sheetExportRuns.userId, session.userId),
          eq(sheetExportRuns.weekKey, sheetWeekKey(first))
        )
      );
    const writes = fake.writes;
    expect(await runSheetExport(db, session.userId, deps)).toBe(true);
    expect(file.tabs).toHaveLength(1);
    expect(fake.writes).toBe(writes);
  });

  it("marca reconexão ao perder token e respeita a desativação", async () => {
    const fake = new FakeGoogle();
    const session = await createUserSession("Dora");
    const accountId = await grant(session.userId);
    const deps: ExportDeps = {
      fetcher: fake.fetch,
      getToken: async () => "test-access-token",
      now: first,
    };
    await activateSheetExport(db, session.userId, deps);
    await db
      .update(account)
      .set({ refreshToken: null })
      .where(eq(account.id, accountId));
    expect(
      await runSheetExport(db, session.userId, { ...deps, now: second })
    ).toBe(false);
    expect((await sheetExportState(db, session.userId, second)).status).toBe(
      "reconnect"
    );
    await disableSheetExport(db, session.userId);
    expect(
      await dueSheetExportUsers(db, sheetWeekKey(second), second)
    ).not.toContain(session.userId);
    const fileCount = fake.files.size;
    await db.delete(user).where(eq(user.id, session.userId));
    expect(fake.files.size).toBe(fileCount);
    expect(await sheetExportState(db, session.userId, second)).toMatchObject({
      status: "off",
    });
  });
});

describe("rotas da exportação", () => {
  it("exige sessão nas ações e segredo no cron", async () => {
    expect(
      (await exportRoute.GET(req("/api/sheets-export"), ctx())).status
    ).toBe(401);
    expect(
      (
        await exportRoute.POST(
          req("/api/sheets-export", {
            method: "POST",
            json: { action: "disable" },
          }),
          ctx()
        )
      ).status
    ).toBe(401);
    expect((await cronRoute.GET(req("/api/cron/sheets-export"))).status).toBe(
      401
    );
    const state = await exportRoute.GET(
      req("/api/sheets-export", { cookie: ana.cookie }),
      ctx()
    );
    expect(state.status).toBe(200);
    expect(state.headers.get("cache-control")).toBe("no-store");
    const disabled = await exportRoute.POST(
      req("/api/sheets-export", {
        method: "POST",
        cookie: ana.cookie,
        json: { action: "disable" },
      }),
      ctx()
    );
    expect(disabled.status).toBe(200);
    expect((await disabled.json()).status).toBe("disabled");
    await db.update(sheetExportConnections).set({ status: "disabled" });
    const authorized = await cronRoute.GET(
      req("/api/cron/sheets-export", {
        headers: { Authorization: "Bearer test-cron-secret-123456789" },
      })
    );
    expect(authorized.status).toBe(200);
    expect((await authorized.json()).processed).toBe(0);
  });
});
