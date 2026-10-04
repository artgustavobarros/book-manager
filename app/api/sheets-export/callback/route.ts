import { NextResponse } from "next/server";

import { withSession } from "@/lib/api";
import { db } from "@/lib/db";
import {
  activateSheetExport,
  disableSheetExport,
} from "@/lib/services/sheet-export";

/** Better Auth redirects here after the Google consent flow. */
export const GET = withSession(async ({ request, userId }) => {
  const url = new URL(request.url);
  let result: string;
  if (url.searchParams.has("error")) {
    await disableSheetExport(db, userId);
    result = "denied";
  } else {
    const state = await activateSheetExport(db, userId);
    result =
      state.status === "enabled"
        ? state.lastError
          ? "error"
          : "ok"
        : "denied";
    if (result === "denied") {
      await disableSheetExport(db, userId);
    }
  }
  const redirect = new URL("/", request.url);
  redirect.searchParams.set("sheetExport", result);
  return NextResponse.redirect(redirect);
});
