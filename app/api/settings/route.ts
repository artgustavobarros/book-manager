import { json, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { getSettings, saveSettings } from "@/lib/services/settings";
import { settingsSchema } from "@/lib/validation/api";

export const GET = withSession(async ({ userId }) =>
  json(await getSettings(db, userId))
);

export const PUT = withSession(async ({ request, userId }) => {
  const { sheetUrl } = await parseBody(request, settingsSchema);
  return json(await saveSettings(db, userId, { sheetUrl: sheetUrl || null }));
});
