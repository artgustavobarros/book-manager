import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { json } from "@/lib/api";
import { db } from "@/lib/db";
import { sheetWeekKey } from "@/lib/domain/weekly-sheets";
import {
  activateSheetExport,
  dueSheetExportUsers,
  runSheetExport,
  sheetExportState,
} from "@/lib/services/sheet-export";

export const maxDuration = 300;
const MAX_USERS = 12;
const DEADLINE_MS = 230_000;

function authorized(request: Request): boolean {
  if (!env.CRON_SECRET) {
    return false;
  }
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return json({ error: "Não autorizado." }, { status: 401 });
  }
  const now = new Date();
  const weekKey = sheetWeekKey(now);
  const deadline = Date.now() + DEADLINE_MS;
  let cursor = "";
  let processed = 0;
  let succeeded = 0;
  while (processed < MAX_USERS && Date.now() < deadline) {
    const ids = await dueSheetExportUsers(
      db,
      weekKey,
      now,
      cursor,
      Math.min(4, MAX_USERS - processed)
    );
    if (ids.length === 0) {
      break;
    }
    for (const userId of ids) {
      cursor = userId;
      const state = await sheetExportState(db, userId, now);
      if (state.status === "pending") {
        await activateSheetExport(db, userId, { now });
      } else if (state.status === "enabled") {
        await runSheetExport(db, userId, { now });
      }
      const after = await sheetExportState(db, userId, now);
      succeeded += Number(after.currentWeekSucceeded);
      processed++;
      if (processed >= MAX_USERS || Date.now() >= deadline) {
        break;
      }
    }
  }
  return json(
    { weekKey, processed, succeeded },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
