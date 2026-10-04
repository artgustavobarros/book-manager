import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
};

/** O link do e-mail passa pelo Better Auth, que redireciona com `?token=` ou `?error=`. */
export default async function RedefinirSenhaPage({
  searchParams,
}: PageProps<"/redefinir-senha">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" && !sp.error ? sp.token : null;
  return (
    <AuthShell>
      <ResetPasswordCard token={token} />
    </AuthShell>
  );
}
