import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth";
import type { DB } from "@/lib/db";
import { books, user } from "@/lib/db/schema";

import {
  clearOutbox,
  linkFrom,
  setupTestDb,
  waitForEmail,
} from "../support/db";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});
beforeEach(clearOutbox);

const headers = () =>
  new Headers({
    "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}`,
  });

async function signUp(email: string, password = "senha-forte-123") {
  return auth.api.signUpEmail({
    body: { name: "Ana Lima", email, password },
    headers: headers(),
  });
}

describe("Better Auth", () => {
  it("aceita senha de seis caracteres no cadastro", async () => {
    await signUp("seis@exemplo.com", "abc123");
    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.email, "seis@exemplo.com"));
    expect(u.email).toBe("seis@exemplo.com");
  });

  it("cadastro cria usuário não verificado e envia o link", async () => {
    await signUp("ana@exemplo.com");
    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.email, "ana@exemplo.com"));
    expect(u.emailVerified).toBe(false);
    const mail = await waitForEmail("ana@exemplo.com");
    expect(mail.subject).toContain("Confirme seu e-mail");
    expect(linkFrom(mail.text)).toContain("/api/auth/verify-email?token=");
  });

  it("permite login antes de verificar e mantém acesso depois", async () => {
    await signUp("bia@exemplo.com");
    const pending = await auth.api.signInEmail({
      body: { email: "bia@exemplo.com", password: "senha-forte-123" },
      headers: headers(),
    });
    expect(pending.user.emailVerified).toBe(false);
    expect(pending.token).toBeTruthy();

    const token = new URL(
      linkFrom((await waitForEmail("bia@exemplo.com")).text)
    ).searchParams.get("token")!;
    await auth.api.verifyEmail({ query: { token }, headers: headers() });
    await expect(
      auth.api.verifyEmail({ query: { token: "invalid" }, headers: headers() })
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });

    const res = await auth.api.signInEmail({
      body: { email: "bia@exemplo.com", password: "senha-forte-123" },
      headers: headers(),
    });
    expect(res.user.email).toBe("bia@exemplo.com");
    expect(res.user.emailVerified).toBe(true);
  });

  it("responde genericamente a cadastro duplicado e só autentica com a senha correta", async () => {
    await signUp("duplicado@exemplo.com");
    const duplicate = await signUp("duplicado@exemplo.com", "senha-errada-456");
    expect(duplicate.token).toBeNull();
    await expect(
      auth.api.signInEmail({
        body: { email: "duplicado@exemplo.com", password: "senha-errada-456" },
        headers: headers(),
      })
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.email, "duplicado@exemplo.com"));
    expect(existing.emailVerified).toBe(false);
  });

  it("recusa um link de verificação após 24 horas", async () => {
    await signUp("expirado@exemplo.com");
    const token = new URL(
      linkFrom((await waitForEmail("expirado@exemplo.com")).text)
    ).searchParams.get("token")!;
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });
    try {
      await expect(
        auth.api.verifyEmail({ query: { token }, headers: headers() })
      ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserva acesso e livros de uma conta pendente após sete dias", async () => {
    await signUp("antiga@exemplo.com");
    const [pending] = await db
      .select()
      .from(user)
      .where(eq(user.email, "antiga@exemplo.com"));
    await db
      .update(user)
      .set({ createdAt: new Date("2026-05-01T00:00:00Z") })
      .where(eq(user.id, pending.id));
    await db.insert(books).values({ userId: pending.id, title: "Livro salvo" });
    const session = await auth.api.signInEmail({
      body: { email: "antiga@exemplo.com", password: "senha-forte-123" },
      headers: headers(),
    });
    expect(session.user.emailVerified).toBe(false);
    expect(
      await db.select().from(books).where(eq(books.userId, pending.id))
    ).toHaveLength(1);
  });

  it("senha errada e e-mail inexistente dão o mesmo erro", async () => {
    const wrong = auth.api.signInEmail({
      body: { email: "bia@exemplo.com", password: "outra-senha-1" },
      headers: headers(),
    });
    const missing = auth.api.signInEmail({
      body: { email: "ninguem@exemplo.com", password: "outra-senha-1" },
      headers: headers(),
    });
    const [a, b] = await Promise.allSettled([wrong, missing]);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("rejected");
    expect((a as PromiseRejectedResult).reason.status).toBe(
      (b as PromiseRejectedResult).reason.status
    );
  });

  it("redefinir a senha verifica o e-mail de uma conta pendente", async () => {
    await signUp("cris@exemplo.com");
    await clearOutbox();
    await auth.api.requestPasswordReset({
      body: { email: "cris@exemplo.com", redirectTo: "/redefinir-senha" },
      headers: headers(),
    });
    const link = linkFrom(
      (await waitForEmail("cris@exemplo.com", { subject: "Redefinir senha" }))
        .text
    );
    const token = new URL(link).pathname.split("/").pop()!;
    await auth.api.resetPassword({
      body: { token, newPassword: "nova-senha-456" },
      headers: headers(),
    });
    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.email, "cris@exemplo.com"));
    expect(u.emailVerified).toBe(true);
    const res = await auth.api.signInEmail({
      body: { email: "cris@exemplo.com", password: "nova-senha-456" },
      headers: headers(),
    });
    expect(res.user.email).toBe("cris@exemplo.com");
  });

  it("senha curta é recusada", async () => {
    await expect(signUp("curta@exemplo.com", "12345")).rejects.toMatchObject({
      status: "BAD_REQUEST",
    });
  });
});
