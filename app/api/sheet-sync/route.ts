import { db } from "@/lib/db";
import { json, parseBody, withSession } from "@/lib/api";
import { SheetError } from "@/lib/domain/sheet";
import { getSettings } from "@/lib/services/settings";
import { SHEET_MESSAGES, syncSheet } from "@/lib/services/sheet-sync";
import { sheetSyncSchema } from "@/lib/validation/api";

/** Sincroniza a planilha do Google Sheets (URL enviada ou a salva) com o acervo. */
export const POST = withSession(async ({ request, userId }) => {
  const body = await parseBody(request, sheetSyncSchema);
  const sheetUrl = body.sheetUrl ?? (await getSettings(db, userId)).sheetUrl;
  if (!sheetUrl) return json({ error: SHEET_MESSAGES.invalidUrl }, { status: 400 });
  try {
    const { updated, added } = await syncSheet(db, userId, sheetUrl);
    return json({ updated, added, message: `Sincronizado: ${updated} livros atualizados e ${added} novos.` });
  } catch (error) {
    if (error instanceof SheetError) {
      const message = error.code === "invalid-url" ? SHEET_MESSAGES.invalidUrl : SHEET_MESSAGES.unreadable;
      return json({ error: message }, { status: error.code === "invalid-url" ? 400 : 422 });
    }
    throw error;
  }
});
