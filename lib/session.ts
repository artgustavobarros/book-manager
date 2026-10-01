import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type Session } from "@/lib/auth";

/** Sessão da requisição atual (memoizada por render). */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** Para páginas e layouts do app: redireciona para a entrada sem sessão válida. */
export async function requirePageSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/entrar");
  return session;
}

/** Para páginas de autenticação: quem já está logado vai para o Painel. */
export async function redirectIfSignedIn(): Promise<void> {
  if (await getSession()) redirect("/");
}
