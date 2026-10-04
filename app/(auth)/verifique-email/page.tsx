import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

export const metadata: Metadata = {
  title: "Verifique seu e-mail",
  robots: { index: false, follow: false },
};

/**
 * Destino do link de verificação: com o token válido o Better Auth já cria a sessão e o
 * layout (auth) redireciona ao Painel; com `?error=` mostramos o estado de link inválido.
 */
export default async function VerifiqueEmailPage({
  searchParams,
}: PageProps<"/verifique-email">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  return (
    <AuthShell>
      <VerifyEmailCard email={one("email")} invalid={!!one("error")} />
    </AuthShell>
  );
}
