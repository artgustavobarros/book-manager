import { json, notFound, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { getGoal, setGoal } from "@/lib/services/goals";
import { goalSchema, yearParamSchema } from "@/lib/validation/api";

const yearOf = (v: string) => {
  const r = yearParamSchema.safeParse(v);
  if (!r.success) {
    throw notFound();
  }
  return r.data;
};

export const GET = withSession<{ year: string }>(async ({ userId, params }) => {
  const year = yearOf(params.year);
  return json({ year, target: await getGoal(db, userId, year) });
});

export const PUT = withSession<{ year: string }>(
  async ({ request, userId, params }) => {
    const year = yearOf(params.year);
    const { target } = await parseBody(request, goalSchema);
    return json({ year, target: await setGoal(db, userId, year, target) });
  }
);
