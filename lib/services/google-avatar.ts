import { eq } from "drizzle-orm";

import { httpsAvatarUrl } from "@/lib/avatar";
import type { DB } from "@/lib/db";
import { user } from "@/lib/db/schema";

interface GoogleAccount {
  accessToken?: string | null;
  accountId: string;
  providerId: string;
  userId: string;
}

/** Copia apenas a foto do Google depois que o vínculo OAuth foi criado. */
export async function syncGoogleAvatar(
  db: DB,
  account: GoogleAccount,
  fetcher: typeof fetch = fetch
): Promise<void> {
  if (account.providerId !== "google" || !account.accessToken) {
    return;
  }

  try {
    const response = await fetcher(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        signal: AbortSignal.timeout(2500),
        cache: "no-store",
      }
    );
    if (!response.ok) {
      return;
    }
    const profile: unknown = await response.json();
    if (!profile || typeof profile !== "object") {
      return;
    }
    const { sub, picture } = profile as Record<string, unknown>;
    const image = httpsAvatarUrl(picture);
    if (sub !== account.accountId || !image) {
      return;
    }
    await db.update(user).set({ image }).where(eq(user.id, account.userId));
  } catch (error) {
    // A foto é opcional: uma falha do Google não pode impedir o vínculo.
    console.warn("[auth] não foi possível atualizar a foto Google", error);
  }
}
