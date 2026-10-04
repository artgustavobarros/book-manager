import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInCard } from "@/components/auth/sign-in-card";
import { googleEnabled } from "@/lib/auth";
import { safeCallback } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  "senha-redefinida": "Senha redefinida. Entre com a nova senha.",
  "conta-excluida": "Conta excluída. Seus livros e dados foram apagados.",
};

export default async function EntrarPage({
  searchParams,
}: PageProps<"/entrar">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  return (
    <AuthShell>
      <SignInCard
        callbackURL={safeCallback(one("voltar"))}
        googleEnabled={googleEnabled}
        initialMode={one("modo") === "cadastro" ? "signup" : "login"}
        notice={NOTICES[one("aviso") ?? ""]}
        oauthError={one("error")}
      />
    </AuthShell>
  );
}
