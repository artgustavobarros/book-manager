import { and, eq } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { readingGoals } from "@/lib/db/schema";
import { DEFAULT_GOAL } from "@/lib/domain/dashboard";

export async function getGoal(db: DB, userId: string, year: number): Promise<number> {
  const [row] = await db
    .select({ target: readingGoals.target })
    .from(readingGoals)
    .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, year)));
  return row?.target ?? DEFAULT_GOAL;
}

export async function setGoal(db: DB, userId: string, year: number, target: number): Promise<number> {
  await db
    .insert(readingGoals)
    .values({ userId, year, target })
    .onConflictDoUpdate({ target: [readingGoals.userId, readingGoals.year], set: { target } });
  return target;
}
