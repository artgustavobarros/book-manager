import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Verifique seu e-mail",
  robots: { index: false, follow: false },
};

/** Link inválido mostra reenvio mesmo para quem já tem sessão pendente. */
export default async function VerifiqueEmailPage({
  searchParams,
}: PageProps<"/verifique-email">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const invalid = !!one("error");
  if (!invalid && (await getSession())?.user.emailVerified) {
    redirect("/");
  }

  return (
    <AuthShell>
      <VerifyEmailCard email={one("email")} invalid={invalid} />
    </AuthShell>
  );
}
