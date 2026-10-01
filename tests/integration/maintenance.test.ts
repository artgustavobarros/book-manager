import { beforeAll, describe, expect, it } from "vitest";

import type { DB } from "@/lib/db";
import { books, user } from "@/lib/db/schema";
import { purgeUnverifiedUsers } from "@/lib/services/maintenance";

import { setupTestDb } from "../support/db";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});

describe("purgeUnverifiedUsers", () => {
  it("remove só não verificados com mais de 7 dias, com cascata", async () => {
    const old = new Date("2026-06-01T00:00:00Z");
    const recent = new Date("2026-06-14T00:00:00Z");
    await db.insert(user).values([
      { id: "old-unverified", name: "A", email: "a@x.com", emailVerified: false, createdAt: old, updatedAt: old },
      { id: "old-verified", name: "B", email: "b@x.com", emailVerified: true, createdAt: old, updatedAt: old },
      { id: "new-unverified", name: "C", email: "c@x.com", emailVerified: false, createdAt: recent, updatedAt: recent },
    ]);
    await db.insert(books).values({ userId: "old-unverified", title: "Some" });
    const removed = await purgeUnverifiedUsers(db, new Date("2026-06-15T00:00:00Z"));
    expect(removed).toBe(1);
    const ids = (await db.select({ id: user.id }).from(user)).map((u) => u.id).sort();
    expect(ids).toEqual(["new-unverified", "old-verified"]);
    expect(await db.select().from(books)).toHaveLength(0);
  });
});
