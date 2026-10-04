import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppProvider } from "@/components/app/app-provider";
import { AppShell } from "@/components/app/app-shell";
import { env } from "@/env";
import { googleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { currentYear, safeTimeZone } from "@/lib/domain/clock";
import { listBooks } from "@/lib/services/books";
import { getGoal } from "@/lib/services/goals";
import { getSettings } from "@/lib/services/settings";
import { requirePageSession } from "@/lib/session";
import { parseTheme, THEME_COOKIE, TZ_COOKIE } from "@/lib/theme";

/** Páginas da conta: nada aqui é para buscador. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Layout autenticado: valida a sessão (a verificação de verdade, além do proxy) e
 * renderiza no servidor já com o acervo, a meta do ano e as configurações.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePageSession();
  const jar = await cookies();
  const tz = safeTimeZone(decodeURIComponent(jar.get(TZ_COOKIE)?.value ?? ""));
  const now = env.FIXED_NOW ? new Date(env.FIXED_NOW) : new Date();
  const year = currentYear(now, tz);

  const [books, goal, settings, accounts] = await Promise.all([
    listBooks(db, user.id),
    getGoal(db, user.id, year),
    getSettings(db, user.id),
    db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, user.id)),
  ]);

  return (
    <AppProvider
      initial={{
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        },
        books,
        goal,
        sheetUrl: settings.sheetUrl,
        year,
        tz,
        now: now.toISOString(),
        theme: parseTheme(jar.get(THEME_COOKIE)?.value),
        googleEnabled,
        hasPassword: accounts.some((a) => a.providerId === "credential"),
        googleLinked: accounts.some((a) => a.providerId === "google"),
      }}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
