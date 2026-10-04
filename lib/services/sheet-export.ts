import { and, asc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import type { DB } from "@/lib/db";
import {
  account,
  sheetExportConnections,
  sheetExportRuns,
} from "@/lib/db/schema";
import { bookSheetRows, sheetWeekKey } from "@/lib/domain/weekly-sheets";

import { listBooks } from "./books";
import {
  createOrRecoverSpreadsheet,
  GoogleSheetsError,
  publishWeek,
} from "./google-sheets";
import {
  DRIVE_FILE_SCOPE,
  type SheetExportState,
} from "./sheet-export-contract";

// Longer than the cron function's 300-second ceiling so a manual retry cannot
// overtake an in-flight export.
const LEASE_MS = 6 * 60_000;

export interface ExportDeps {
  fetcher?: typeof fetch;
  getToken?: (accountId: string, userId: string) => Promise<string>;
  now?: Date;
}

type Connection = typeof sheetExportConnections.$inferSelect;

function safeMessage(error: unknown): string {
  if (error instanceof GoogleSheetsError) {
    switch (error.kind) {
      case "reconnect":
        return "A autorização do Google expirou. Reconecte a conta.";
      case "missing":
        return "A planilha não foi encontrada. Desative e conecte novamente.";
      case "temporary":
        return "O Google está indisponível. Tentaremos novamente.";
      default:
        return "Não foi possível salvar no Google Sheets.";
    }
  }
  return "Não foi possível salvar no Google Sheets.";
}

function hasScope(scope: string | null): boolean {
  return (scope ?? "").split(/[\s,]+/).includes(DRIVE_FILE_SCOPE);
}

async function connection(db: DB, userId: string): Promise<Connection | null> {
  const [row] = await db
    .select()
    .from(sheetExportConnections)
    .where(eq(sheetExportConnections.userId, userId));
  return row ?? null;
}

export async function sheetExportState(
  db: DB,
  userId: string,
  now = new Date()
): Promise<SheetExportState> {
  const weekKey = sheetWeekKey(now);
  const [conn, run] = await Promise.all([
    connection(db, userId),
    db
      .select({ status: sheetExportRuns.status })
      .from(sheetExportRuns)
      .where(
        and(
          eq(sheetExportRuns.userId, userId),
          eq(sheetExportRuns.weekKey, weekKey)
        )
      )
      .then((rows) => rows[0]),
  ]);
  return {
    status:
      conn?.status === "enabled" && !conn.accountId
        ? "reconnect"
        : (conn?.status ?? "off"),
    spreadsheetUrl: conn?.spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(conn.spreadsheetId)}/edit`
      : null,
    lastSucceededAt: conn?.lastSucceededAt?.toISOString() ?? null,
    lastFailedAt: conn?.lastFailedAt?.toISOString() ?? null,
    lastError:
      conn?.status === "enabled" && !conn.accountId
        ? "Reconecte sua conta Google para continuar."
        : (conn?.lastError ?? null),
    currentWeek: weekKey,
    currentWeekSucceeded: run?.status === "succeeded",
  };
}

/** Records intent before redirecting to Google. No export occurs until consent returns. */
export async function startSheetExport(db: DB, userId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(sheetExportConnections)
    .values({ userId, status: "pending", updatedAt: now })
    .onConflictDoUpdate({
      target: sheetExportConnections.userId,
      set: {
        status: "pending",
        updatedAt: now,
        lastError: null,
        lastFailedAt: null,
      },
    });
}

async function newlyGrantedAccount(db: DB, conn: Connection) {
  const accounts = await db
    .select()
    .from(account)
    .where(
      and(eq(account.userId, conn.userId), eq(account.providerId, "google"))
    );
  return (
    accounts
      .filter(
        (a) =>
          !!a.refreshToken &&
          hasScope(a.scope) &&
          a.updatedAt.getTime() >= conn.updatedAt.getTime() - 1000
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null
  );
}

/** Called after Better Auth redirects back; cron can also finish a pending grant. */
export async function activateSheetExport(
  db: DB,
  userId: string,
  deps: ExportDeps = {}
): Promise<SheetExportState> {
  const conn = await connection(db, userId);
  if (!conn || conn.status !== "pending") {
    return sheetExportState(db, userId, deps.now);
  }
  const linked = await newlyGrantedAccount(db, conn);
  if (!linked) {
    return sheetExportState(db, userId, deps.now);
  }
  if (conn.accountId && conn.accountId !== linked.id) {
    await db.delete(sheetExportRuns).where(eq(sheetExportRuns.userId, userId));
  }
  await db
    .update(sheetExportConnections)
    .set({
      accountId: linked.id,
      spreadsheetId: conn.accountId === linked.id ? conn.spreadsheetId : null,
      status: "enabled",
      lastSucceededAt:
        conn.accountId === linked.id ? conn.lastSucceededAt : null,
      lastError: null,
      lastFailedAt: null,
    })
    .where(
      and(
        eq(sheetExportConnections.userId, userId),
        eq(sheetExportConnections.status, "pending")
      )
    );
  await runSheetExport(db, userId, deps);
  return sheetExportState(db, userId, deps.now);
}

export async function disableSheetExport(db: DB, userId: string) {
  await db
    .update(sheetExportConnections)
    .set({ status: "disabled", lastError: null, lastFailedAt: null })
    .where(eq(sheetExportConnections.userId, userId));
}

async function getGoogleToken(accountId: string, userId: string) {
  try {
    const result = await auth.api.getAccessToken({
      body: { accountId, userId },
    });
    if (!result.accessToken) {
      throw new GoogleSheetsError("reconnect");
    }
    return result.accessToken;
  } catch {
    throw new GoogleSheetsError("reconnect");
  }
}

/** Atomic claim: attempts is also the lease generation, so stale workers cannot finalize. */
async function claimRun(db: DB, userId: string, weekKey: string, now: Date) {
  await db
    .insert(sheetExportRuns)
    .values({
      userId,
      weekKey,
      status: "failed",
      attempts: 0,
      startedAt: now,
    })
    .onConflictDoNothing();
  const [claimed] = await db
    .update(sheetExportRuns)
    .set({
      status: "processing",
      attempts: sql`${sheetExportRuns.attempts} + 1`,
      startedAt: now,
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      error: null,
    })
    .where(
      and(
        eq(sheetExportRuns.userId, userId),
        eq(sheetExportRuns.weekKey, weekKey),
        or(
          eq(sheetExportRuns.status, "failed"),
          and(
            eq(sheetExportRuns.status, "processing"),
            lt(sheetExportRuns.leaseUntil, now)
          )
        )
      )
    )
    .returning({ attempts: sheetExportRuns.attempts });
  return claimed?.attempts ?? null;
}

async function finalizeRun(
  db: DB,
  userId: string,
  weekKey: string,
  attempts: number,
  accountId: string,
  error: unknown | null,
  now: Date
) {
  const [updated] = await db
    .update(sheetExportRuns)
    .set({
      status: error ? "failed" : "succeeded",
      completedAt: now,
      leaseUntil: null,
      error: error ? safeMessage(error) : null,
    })
    .where(
      and(
        eq(sheetExportRuns.userId, userId),
        eq(sheetExportRuns.weekKey, weekKey),
        eq(sheetExportRuns.status, "processing"),
        eq(sheetExportRuns.attempts, attempts)
      )
    )
    .returning({ userId: sheetExportRuns.userId });
  if (!updated) {
    return;
  }
  await db
    .update(sheetExportConnections)
    .set(
      error
        ? {
            status:
              error instanceof GoogleSheetsError && error.kind === "reconnect"
                ? "reconnect"
                : "enabled",
            lastFailedAt: now,
            lastError: safeMessage(error),
          }
        : {
            lastSucceededAt: now,
            lastFailedAt: null,
            lastError: null,
          }
    )
    .where(
      and(
        eq(sheetExportConnections.userId, userId),
        eq(sheetExportConnections.accountId, accountId),
        eq(sheetExportConnections.status, "enabled")
      )
    );
}

/** One user/week. All queries are scoped to the userId from DB or session. */
export async function runSheetExport(
  db: DB,
  userId: string,
  deps: ExportDeps = {}
): Promise<boolean> {
  const now = deps.now ?? new Date();
  const weekKey = sheetWeekKey(now);
  const conn = await connection(db, userId);
  if (conn?.status !== "enabled") {
    return false;
  }
  if (!conn.accountId) {
    await db
      .update(sheetExportConnections)
      .set({
        status: "reconnect",
        lastError: "Reconecte sua conta Google para continuar.",
        lastFailedAt: now,
      })
      .where(eq(sheetExportConnections.userId, userId));
    return false;
  }
  const attempts = await claimRun(db, userId, weekKey, now);
  if (attempts === null) {
    return false;
  }
  try {
    const [linked] = await db
      .select({ scope: account.scope, refreshToken: account.refreshToken })
      .from(account)
      .where(
        and(
          eq(account.id, conn.accountId),
          eq(account.userId, userId),
          eq(account.providerId, "google")
        )
      );
    if (!(linked?.refreshToken && hasScope(linked.scope))) {
      throw new GoogleSheetsError("reconnect");
    }
    const token = await (deps.getToken ?? getGoogleToken)(
      conn.accountId,
      userId
    );
    let spreadsheetId = conn.spreadsheetId;
    if (!spreadsheetId) {
      spreadsheetId = await createOrRecoverSpreadsheet(
        token,
        userId,
        weekKey,
        deps.fetcher
      );
      const [saved] = await db
        .update(sheetExportConnections)
        .set({ spreadsheetId })
        .where(
          and(
            eq(sheetExportConnections.userId, userId),
            eq(sheetExportConnections.accountId, conn.accountId),
            eq(sheetExportConnections.status, "enabled")
          )
        )
        .returning({ userId: sheetExportConnections.userId });
      if (!saved) {
        throw new GoogleSheetsError("unavailable");
      }
    }
    // A user may have disabled export while token renewal or file creation ran.
    const current = await connection(db, userId);
    if (current?.status !== "enabled" || current.accountId !== conn.accountId) {
      throw new GoogleSheetsError("unavailable");
    }
    const rows = bookSheetRows(await listBooks(db, userId));
    await publishWeek(spreadsheetId, token, weekKey, rows, deps.fetcher);
    await finalizeRun(
      db,
      userId,
      weekKey,
      attempts,
      conn.accountId,
      null,
      new Date()
    );
    return true;
  } catch (error) {
    await finalizeRun(
      db,
      userId,
      weekKey,
      attempts,
      conn.accountId,
      error,
      new Date()
    );
    return false;
  }
}

/** Keyset pagination avoids scanning already visited users in the same invocation. */
export async function dueSheetExportUsers(
  db: DB,
  weekKey: string,
  now: Date,
  afterUserId = "",
  limit = 12
): Promise<string[]> {
  const rows = await db
    .select({ userId: sheetExportConnections.userId })
    .from(sheetExportConnections)
    .leftJoin(
      sheetExportRuns,
      and(
        eq(sheetExportRuns.userId, sheetExportConnections.userId),
        eq(sheetExportRuns.weekKey, weekKey)
      )
    )
    .where(
      and(
        gt(sheetExportConnections.userId, afterUserId),
        or(
          eq(sheetExportConnections.status, "pending"),
          eq(sheetExportConnections.status, "enabled")
        ),
        or(
          isNull(sheetExportRuns.userId),
          eq(sheetExportRuns.status, "failed"),
          and(
            eq(sheetExportRuns.status, "processing"),
            lt(sheetExportRuns.leaseUntil, now)
          )
        )
      )
    )
    .orderBy(asc(sheetExportConnections.userId))
    .limit(limit);
  return rows.map((r) => r.userId);
}
