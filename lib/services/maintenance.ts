import { and, eq, lt } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const UNVERIFIED_TTL_DAYS = 7;

/**
 * Exclui cadastros com e-mail não verificado criados há mais de 7 dias (sessões,
 * contas, livros e configurações saem junto via ON DELETE CASCADE).
 */
export async function purgeUnverifiedUsers(
  db: DB,
  now: Date = new Date()
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - UNVERIFIED_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  const removed = await db
    .delete(user)
    .where(and(eq(user.emailVerified, false), lt(user.createdAt, cutoff)))
    .returning({ id: user.id });
  return removed.length;
}
