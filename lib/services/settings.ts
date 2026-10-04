import { eq } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";

export interface UserSettings {
  sheetUrl: string | null;
}

export async function getSettings(
  db: DB,
  userId: string
): Promise<UserSettings> {
  const [row] = await db
    .select({ sheetUrl: userSettings.sheetUrl })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return { sheetUrl: row?.sheetUrl ?? null };
}

export async function saveSettings(
  db: DB,
  userId: string,
  settings: UserSettings
): Promise<UserSettings> {
  await db
    .insert(userSettings)
    .values({ userId, sheetUrl: settings.sheetUrl })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { sheetUrl: settings.sheetUrl },
    });
  return settings;
}
