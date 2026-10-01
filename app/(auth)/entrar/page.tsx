import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInCard } from "@/components/auth/sign-in-card";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar · Bodega Literária" };

const NOTICES: Record<string, string> = {
  "senha-redefinida": "Senha redefinida. Entre com a nova senha.",
  "conta-excluida": "Conta excluída. Seus livros e dados foram apagados.",
};

/** Só caminhos internos (evita redirecionamento aberto). */
function safeCallback(v: string | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  return (
    <AuthShell>
      <SignInCard
        initialMode={one("modo") === "cadastro" ? "signup" : "login"}
        googleEnabled={googleEnabled}
        callbackURL={safeCallback(one("voltar"))}
        oauthError={one("error")}
        notice={NOTICES[one("aviso") ?? ""]}
      />
    </AuthShell>
  );
}
