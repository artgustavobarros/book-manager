import { NextResponse } from "next/server";

import { env } from "@/env";
import { db } from "@/lib/db";
import { purgeUnverifiedUsers } from "@/lib/services/maintenance";

/** Vercel Cron diário (vercel.json). A Vercel envia `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  if (
    !env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const removed = await purgeUnverifiedUsers(db);
  return NextResponse.json({ removed });
}
