import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";
import type { DB } from "@/lib/db";
import { user } from "@/lib/db/schema";

import { clearOutbox, linkFrom, setupTestDb, waitForEmail } from "../support/db";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});
beforeEach(clearOutbox);

const headers = () => new Headers({ "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}` });

async function signUp(email: string, password = "senha-forte-123") {
  return auth.api.signUpEmail({ body: { name: "Ana Lima", email, password }, headers: headers() });
}

describe("Better Auth", () => {
  it("cadastro cria usuário não verificado e envia o link", async () => {
    await signUp("ana@exemplo.com");
    const [u] = await db.select().from(user).where(eq(user.email, "ana@exemplo.com"));
    expect(u.emailVerified).toBe(false);
    const mail = await waitForEmail("ana@exemplo.com");
    expect(mail.subject).toContain("Confirme seu e-mail");
    expect(linkFrom(mail.text)).toContain("/api/auth/verify-email?token=");
  });

  it("bloqueia login antes de verificar e libera depois", async () => {
    await signUp("bia@exemplo.com");
    await expect(
      auth.api.signInEmail({ body: { email: "bia@exemplo.com", password: "senha-forte-123" }, headers: headers() }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });

    const token = new URL(linkFrom((await waitForEmail("bia@exemplo.com")).text)).searchParams.get("token")!;
    await auth.api.verifyEmail({ query: { token }, headers: headers() });

    const res = await auth.api.signInEmail({ body: { email: "bia@exemplo.com", password: "senha-forte-123" }, headers: headers() });
    expect(res.user.email).toBe("bia@exemplo.com");
  });

  it("senha errada e e-mail inexistente dão o mesmo erro", async () => {
    const wrong = auth.api.signInEmail({ body: { email: "bia@exemplo.com", password: "outra-senha-1" }, headers: headers() });
    const missing = auth.api.signInEmail({ body: { email: "ninguem@exemplo.com", password: "outra-senha-1" }, headers: headers() });
    const [a, b] = await Promise.allSettled([wrong, missing]);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("rejected");
    expect((a as PromiseRejectedResult).reason.status).toBe((b as PromiseRejectedResult).reason.status);
  });

  it("redefinir a senha verifica o e-mail de uma conta pendente", async () => {
    await signUp("cris@exemplo.com");
    await clearOutbox();
    await auth.api.requestPasswordReset({ body: { email: "cris@exemplo.com", redirectTo: "/redefinir-senha" }, headers: headers() });
    const link = linkFrom((await waitForEmail("cris@exemplo.com", { subject: "Redefinir senha" })).text);
    const token = new URL(link).pathname.split("/").pop()!;
    await auth.api.resetPassword({ body: { token, newPassword: "nova-senha-456" }, headers: headers() });
    const [u] = await db.select().from(user).where(eq(user.email, "cris@exemplo.com"));
    expect(u.emailVerified).toBe(true);
    const res = await auth.api.signInEmail({ body: { email: "cris@exemplo.com", password: "nova-senha-456" }, headers: headers() });
    expect(res.user.email).toBe("cris@exemplo.com");
  });

  it("senha curta é recusada", async () => {
    await expect(signUp("curta@exemplo.com", "1234567")).rejects.toMatchObject({ status: "BAD_REQUEST" });
  });
});
