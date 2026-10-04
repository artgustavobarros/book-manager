import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

let n = 0;

/** Cria um usuário verificado e devolve o cabeçalho Cookie de uma sessão válida. */
export async function createUserSession(
  name = "Ana Lima"
): Promise<{ cookie: string; userId: string; email: string }> {
  n += 1;
  const email = `user${n}-${Date.now()}@exemplo.com`;
  const password = "senha-forte-123";
  const headers = new Headers({ "x-forwarded-for": `10.1.${n % 250}.1` });
  await auth.api.signUpEmail({ body: { name, email, password }, headers });
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, email));
  const res = await auth.api.signInEmail({
    body: { email, password },
    headers,
    returnHeaders: true,
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie
    .split(/,(?=\s*[\w.-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
  return { cookie, userId: res.response.user.id, email };
}

export function req(
  url: string,
  init: RequestInit & { cookie?: string; json?: unknown } = {}
): Request {
  const headers = new Headers(init.headers);
  if (init.cookie) {
    headers.set("cookie", init.cookie);
  }
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new Request(new URL(url, "http://localhost:3000"), {
    ...init,
    headers,
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  });
}

export const ctx = <P extends Record<string, string>>(params: P = {} as P) => ({
  params: Promise.resolve(params),
});
