import { NextResponse } from "next/server";

import { withSession } from "@/lib/api";
import { db } from "@/lib/db";
import {
  activateSheetExport,
  cancelPendingSheetExport,
} from "@/lib/services/sheet-export";

/**
 * Better Auth redirects here after the Google consent flow.
 *
 * É um GET que muda estado e só confere o cookie de sessão, então uma
 * navegação de topo vinda de outro site chega aqui com a sessão da vítima.
 * Por isso o cancelamento é limitado ao fluxo pendente: sem um `connect`
 * iniciado por quem pede, não há o que desativar.
 */
export const GET = withSession(async ({ request, userId }) => {
  const url = new URL(request.url);
  let result: string;
  if (url.searchParams.has("error")) {
    await cancelPendingSheetExport(db, userId);
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
      await cancelPendingSheetExport(db, userId);
    }
  }
  const redirect = new URL("/", request.url);
  redirect.searchParams.set("sheetExport", result);
  return NextResponse.redirect(redirect);
});
