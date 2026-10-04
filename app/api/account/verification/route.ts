import { eq } from "drizzle-orm";

import { json, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/** Lê o estado atual no banco, inclusive após verificação em outra aba. */
export const GET = withSession(async ({ userId }) => {
  const [row] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));

  if (!row) {
    return json({ error: "Não autenticado." }, { status: 401 });
  }

  return json(row, { headers: { "Cache-Control": "private, no-store" } });
});
