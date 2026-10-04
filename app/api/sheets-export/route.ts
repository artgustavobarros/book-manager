import { z } from "zod";

import { json, parseBody, withSession } from "@/lib/api";
import { googleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activateSheetExport,
  disableSheetExport,
  runSheetExport,
  sheetExportState,
  startSheetExport,
} from "@/lib/services/sheet-export";

const actionSchema = z.object({
  action: z.enum(["connect", "activate", "retry", "disable"]),
});

export const GET = withSession(async ({ userId }) =>
  json(await sheetExportState(db, userId), {
    headers: { "Cache-Control": "no-store" },
  })
);

export const POST = withSession(async ({ request, userId }) => {
  const { action } = await parseBody(request, actionSchema);
  if (action === "connect") {
    if (!googleEnabled) {
      return json(
        { error: "Google não está configurado neste ambiente." },
        { status: 503 }
      );
    }
    await startSheetExport(db, userId);
  } else if (action === "activate") {
    await activateSheetExport(db, userId);
  } else if (action === "retry") {
    const state = await sheetExportState(db, userId);
    if (state.status !== "enabled" || state.currentWeekSucceeded) {
      return json(
        { error: "Esta exportação não precisa de nova tentativa." },
        { status: 409 }
      );
    }
    await runSheetExport(db, userId);
  } else {
    await disableSheetExport(db, userId);
  }
  return json(await sheetExportState(db, userId), {
    headers: { "Cache-Control": "no-store" },
  });
});
