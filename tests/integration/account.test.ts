import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import {
  clearOutbox,
  linkFrom,
  setupTestDb,
  waitForEmail,
} from "../support/db";
import { createUserSession } from "../support/session";

const PASSWORD = "senha-forte-123";

beforeAll(async () => {
  await setupTestDb();
});
beforeEach(clearOutbox);

const headers = (cookie?: string) => {
  const h = new Headers({
    "x-forwarded-for": `10.2.0.${Math.floor(Math.random() * 200)}`,
  });
  if (cookie) {
    h.set("cookie", cookie);
  }
  return h;
};

const signIn = (email: string, password = PASSWORD) =>
  auth.api.signInEmail({ body: { email, password }, headers: headers() });

describe("troca de e-mail", () => {
  it("envia o texto da troca ao novo endereço e só troca após o link", async () => {
    const ana = await createUserSession();
    const newEmail = `nova-${Date.now()}@exemplo.com`;
    await auth.api.changeEmail({
      body: { newEmail, callbackURL: "/" },
      headers: headers(ana.cookie),
    });

    const mail = await waitForEmail(newEmail);
    expect(mail.subject).toBe("Confirme o novo e-mail · Bodega Literária");
    expect(mail.text).toContain(newEmail);
    expect(mail.text).not.toContain("Falta só um passo");

    // Até a confirmação, o e-mail atual continua valendo.
    expect((await signIn(ana.email)).user.email).toBe(ana.email);

    const token = new URL(linkFrom(mail.text)).searchParams.get("token")!;
    await auth.api.verifyEmail({
      query: { token },
      headers: headers(ana.cookie),
    });

    const res = await signIn(newEmail);
    expect(res.user.email).toBe(newEmail);
    expect(res.user.emailVerified).toBe(true);
    await expect(signIn(ana.email)).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
  });

  it("não envia link para um e-mail que já pertence a outra conta", async () => {
    const ana = await createUserSession();
    const bia = await createUserSession("Bia Souza");
    await clearOutbox();
    await auth.api.changeEmail({
      body: { newEmail: bia.email, callbackURL: "/" },
      headers: headers(ana.cookie),
    });
    await expect(waitForEmail(bia.email, { timeoutMs: 300 })).rejects.toThrow(
      "Nenhum e-mail"
    );
  });
});

describe("troca de senha", () => {
  it("recusa a senha atual incorreta", async () => {
    const ana = await createUserSession();
    await expect(
      auth.api.changePassword({
        body: { currentPassword: "errada-123", newPassword: "nova-senha-456" },
        headers: headers(ana.cookie),
      })
    ).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });
    expect((await signIn(ana.email)).user.email).toBe(ana.email);
  });

  it("troca válida revoga as outras sessões e passa a aceitar a nova senha", async () => {
    const ana = await createUserSession();
    const other = await auth.api.signInEmail({
      body: { email: ana.email, password: PASSWORD },
      headers: headers(),
      returnHeaders: true,
    });
    const otherCookie = (other.headers.get("set-cookie") ?? "")
      .split(/,(?=\s*[\w.-]+=)/)
      .map((c) => c.split(";")[0].trim())
      .join("; ");
    expect(
      await auth.api.getSession({ headers: headers(otherCookie) })
    ).not.toBeNull();

    await auth.api.changePassword({
      body: {
        currentPassword: PASSWORD,
        newPassword: "nova-senha-456",
        revokeOtherSessions: true,
      },
      headers: headers(ana.cookie),
    });

    expect(await auth.api.getSession({ headers: headers(otherCookie) })).toBe(
      null
    );
    await expect(signIn(ana.email)).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
    expect((await signIn(ana.email, "nova-senha-456")).user.email).toBe(
      ana.email
    );
  });
});
