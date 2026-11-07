/**
 * Regressão dos achados 1 e 2 da auditoria de segurança (run-1).
 *
 * 1. Pre-account hijack: quem cadastrava um e-mail que não era seu (sem
 *    verificar) vinculava o próprio Google; o vínculo sobrevivia à redefinição
 *    de senha feita pelo dono real, e o login Google caía na conta do dono.
 * 2. "Desvincular" mandava `accountId` do provedor em vez do `id` da linha,
 *    então o dono não conseguia remover o vínculo pela interface.
 *
 * A correção tem duas camadas, e cada uma tem o seu bloco aqui:
 *  - o portão em `/link-social` impede novos vínculos pré-posse ("vínculo
 *    plantado");
 *  - a limpeza em `onPasswordReset` e `beforeEmailVerification` remove os que
 *    já existirem no banco ("limpeza de vínculos legados"). Esse bloco planta a
 *    linha direto pelo adaptador, contornando o portão de propósito — senão a
 *    limpeza ficaria sem cobertura.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { betterAuth } from "better-auth";
import { and, eq } from "drizzle-orm";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { auth } from "@/lib/auth";
import type { DB } from "@/lib/db";
import { account, session as sessionTable, user } from "@/lib/db/schema";

import {
  clearOutbox,
  linkFrom,
  setupTestDb,
  waitForEmail,
} from "../../support/db";

const ATTACKER_EMAIL = "atacante@exemplo.test";
const PASSWORD = "senha-forte-123";

/** Identidade Google de quem ataca; única por teste, senão o segundo vínculo
 * bate em SOCIAL_ACCOUNT_ALREADY_LINKED e o teste passa sem provar nada. */
let attackerSub = "";

let db: DB;
let oauth: ReturnType<typeof makeOAuth>;

type GoogleConfig = NonNullable<
  NonNullable<typeof auth.options.socialProviders>["google"]
>;

/** Provedor Google simulado: sem rede, sem JWT real. */
function googleStub(): GoogleConfig {
  return {
    clientId: "sandbox",
    clientSecret: "sandbox",
    verifyIdToken: async () => true,
    getUserInfo: async () => ({
      user: {
        id: attackerSub,
        name: "Pessoa Atacante",
        email: ATTACKER_EMAIL,
        emailVerified: true,
      },
      data: {
        sub: attackerSub,
        email: ATTACKER_EMAIL,
        email_verified: true,
        name: "Pessoa Atacante",
      },
    }),
  } as unknown as GoogleConfig;
}

/** Mesma configuração do app, só com o Google ligado e simulado. */
function makeOAuth() {
  return betterAuth({
    ...auth.options,
    socialProviders: { google: googleStub() },
  });
}

beforeAll(async () => {
  db = await setupTestDb();
  oauth = makeOAuth();
});

beforeEach(async () => {
  await clearOutbox();
  attackerSub = `google-sub-${crypto.randomUUID()}`;
  // O hook databaseHooks.account.create chama o Google para a foto do perfil.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ sub: attackerSub }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
function headers(cookie?: string) {
  n += 1;
  const h = new Headers({
    "x-forwarded-for": `10.9.${n % 250}.${(n * 7) % 250}`,
  });
  if (cookie) {
    h.set("cookie", cookie);
  }
  return h;
}

function cookieFrom(res: { headers: Headers }) {
  return (res.headers.get("set-cookie") ?? "")
    .split(/,(?=\s*[\w.-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/** Cadastro não verificado + sessão, como faz a tela de entrada. */
async function plantAccount(email: string) {
  await oauth.api.signUpEmail({
    body: { name: "Nome Plantado", email, password: PASSWORD },
    headers: headers(),
  });
  const res = await oauth.api.signInEmail({
    body: { email, password: PASSWORD },
    headers: headers(),
    returnHeaders: true,
  });
  return { cookie: cookieFrom(res), userId: res.response.user.id };
}

/**
 * Tenta vincular o Google. Depois da correção isto será recusado — os testes
 * seguintes continuam válidos: sem vínculo, não há o que sobreviver ao reset
 * nem conta alheia onde cair.
 */
async function linkGoogle(cookie: string) {
  await oauth.api
    .linkSocialAccount({
      body: { provider: "google", idToken: { token: "id-token-falso" } },
      headers: headers(cookie),
    })
    .catch(() => null);
}

/** Linhas Google do usuário. */
function googleRows(userId: string) {
  return db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")));
}

/**
 * Planta o vínculo direto pelo adaptador, contornando o portão de
 * `/link-social`. Representa o que já pode existir no banco de antes da
 * correção — é o único jeito de cobrir a limpeza.
 */
async function plantLegacyLink(userId: string) {
  await (await oauth.$context).internalAdapter.createAccount({
    providerId: "google",
    accountId: attackerSub,
    userId,
    accessToken: "token-google",
  });
  const rows = await googleRows(userId);
  if (rows.length !== 1) {
    throw new Error(`esperava 1 vínculo plantado, veio ${rows.length}`);
  }
}

describe("achado 1 — vínculo Google plantado antes da posse do e-mail", () => {
  it("não aceita /link-social de uma sessão com e-mail não verificado", async () => {
    const email = `vitima-link-${Date.now()}@exemplo.test`;
    const { cookie, userId } = await plantAccount(email);

    const [planted] = await db.select().from(user).where(eq(user.id, userId));
    expect(planted.emailVerified).toBe(false);

    await expect(
      oauth.api.linkSocialAccount({
        body: { provider: "google", idToken: { token: "id-token-falso" } },
        headers: headers(cookie),
      })
    ).rejects.toMatchObject({
      status: expect.stringMatching(/UNAUTHORIZED|FORBIDDEN/),
    });

    expect(
      await db
        .select()
        .from(account)
        .where(
          and(eq(account.userId, userId), eq(account.providerId, "google"))
        )
    ).toHaveLength(0);
  });

  it("redefinir a senha remove vínculos criados antes da prova de posse", async () => {
    const email = `vitima-reset-${Date.now()}@exemplo.test`;
    const { cookie, userId } = await plantAccount(email);

    await linkGoogle(cookie);

    // O dono real assume o endereço pelo link do e-mail.
    await clearOutbox();
    await oauth.api.requestPasswordReset({
      body: { email, redirectTo: "/redefinir-senha" },
      headers: headers(),
    });
    const link = linkFrom(
      (await waitForEmail(email, { subject: "Redefinir senha" })).text
    );
    const token = new URL(link).pathname.split("/").pop();
    await oauth.api.resetPassword({
      body: { token: token as string, newPassword: "nova-senha-456" },
      headers: headers(),
    });

    const [owner] = await db.select().from(user).where(eq(user.id, userId));
    expect(owner.emailVerified).toBe(true);
    expect(
      await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, userId))
    ).toHaveLength(0);

    expect(
      await db
        .select()
        .from(account)
        .where(
          and(eq(account.userId, userId), eq(account.providerId, "google"))
        )
    ).toHaveLength(0);
  });

  it("login Google de quem plantou o vínculo não entra na conta do dono", async () => {
    const email = `vitima-login-${Date.now()}@exemplo.test`;
    const { cookie, userId } = await plantAccount(email);

    await linkGoogle(cookie);

    await clearOutbox();
    await oauth.api.requestPasswordReset({
      body: { email, redirectTo: "/redefinir-senha" },
      headers: headers(),
    });
    const token = new URL(
      linkFrom((await waitForEmail(email, { subject: "Redefinir senha" })).text)
    ).pathname
      .split("/")
      .pop();
    await oauth.api.resetPassword({
      body: { token: token as string, newPassword: "nova-senha-456" },
      headers: headers(),
    });

    const signedIn = await oauth.api
      .signInSocial({
        body: { provider: "google", idToken: { token: "id-token-falso" } },
        headers: headers(),
      })
      .catch(() => null);

    // Se o login Google funcionar, tem de criar/usar uma conta própria —
    // nunca a do dono do endereço.
    const landedOn = signedIn && "user" in signedIn ? signedIn.user.id : null;
    expect(landedOn).not.toBe(userId);
  });
});

describe("achado 1 — limpeza de vínculos legados", () => {
  it("redefinir a senha apaga o vínculo plantado e preserva a senha", async () => {
    const email = `legado-reset-${Date.now()}@exemplo.test`;
    const { userId } = await plantAccount(email);
    await plantLegacyLink(userId);

    await clearOutbox();
    await oauth.api.requestPasswordReset({
      body: { email, redirectTo: "/redefinir-senha" },
      headers: headers(),
    });
    const token = new URL(
      linkFrom((await waitForEmail(email, { subject: "Redefinir senha" })).text)
    ).pathname
      .split("/")
      .pop();
    await oauth.api.resetPassword({
      body: { token: token as string, newPassword: "nova-senha-456" },
      headers: headers(),
    });

    expect(await googleRows(userId)).toHaveLength(0);
    const [owner] = await db.select().from(user).where(eq(user.id, userId));
    expect(owner.emailVerified).toBe(true);

    // A conta `credential` não pode ter sido apagada junto.
    const signedIn = await oauth.api.signInEmail({
      body: { email, password: "nova-senha-456" },
      headers: headers(),
    });
    expect(signedIn.user.id).toBe(userId);
  });

  it("verificar o e-mail apaga o vínculo plantado", async () => {
    const email = `legado-verify-${Date.now()}@exemplo.test`;
    await clearOutbox();
    const { userId } = await plantAccount(email);
    await plantLegacyLink(userId);

    const token = new URL(
      linkFrom(
        (await waitForEmail(email, { subject: "Confirme seu e-mail" })).text
      )
    ).searchParams.get("token");
    await oauth.api.verifyEmail({
      query: { token: token as string },
      headers: headers(),
    });

    expect(await googleRows(userId)).toHaveLength(0);
    const [owner] = await db.select().from(user).where(eq(user.id, userId));
    expect(owner.emailVerified).toBe(true);
  });

  it("não mexe no vínculo de quem já tinha o e-mail verificado", async () => {
    const email = `legitimo-${Date.now()}@exemplo.test`;
    const { userId } = await plantAccount(email);
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, userId));
    await plantLegacyLink(userId);

    await clearOutbox();
    await oauth.api.requestPasswordReset({
      body: { email, redirectTo: "/redefinir-senha" },
      headers: headers(),
    });
    const token = new URL(
      linkFrom((await waitForEmail(email, { subject: "Redefinir senha" })).text)
    ).pathname
      .split("/")
      .pop();
    await oauth.api.resetPassword({
      body: { token: token as string, newPassword: "nova-senha-456" },
      headers: headers(),
    });

    // Esquecer a senha não pode custar o login Google de quem já era dono.
    expect(await googleRows(userId)).toHaveLength(1);
  });
});

describe("achado 2 — botão Desvincular", () => {
  it("só o id da linha desvincula; o sub do provedor não", async () => {
    const email = `desvincular-${Date.now()}@exemplo.test`;
    const { cookie, userId } = await plantAccount(email);
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, userId));

    // Vínculo criado pelo caminho normal do better-auth.
    await (await oauth.$context).internalAdapter.createAccount({
      providerId: "google",
      accountId: attackerSub,
      userId,
      accessToken: "token-google",
    });

    const accounts = await oauth.api.listUserAccounts({
      headers: headers(cookie),
    });
    const google = accounts.find((a) => a.providerId === "google") as {
      id: string;
      accountId: string;
    };
    expect(google).toBeDefined();
    // Se um dia virarem o mesmo valor, o teste abaixo perde o sentido.
    expect(google.id).not.toBe(google.accountId);

    // O `sub` do Google não é aceito: era exatamente o bug.
    await expect(
      oauth.api.unlinkAccount({
        body: { accountId: google.accountId },
        headers: headers(cookie),
      })
    ).rejects.toMatchObject({ body: { code: "ACCOUNT_NOT_FOUND" } });

    // O `id` da linha é.
    await expect(
      oauth.api.unlinkAccount({
        body: { accountId: google.id },
        headers: headers(cookie),
      })
    ).resolves.toMatchObject({ status: true });

    expect(await googleRows(userId)).toHaveLength(0);
  });

  /**
   * O teste acima prova qual campo o endpoint aceita, mas não qual campo a
   * tela manda — e o bug era exatamente esse. Sem renderizar o modal inteiro,
   * a guarda barata é ler a fonte do handler.
   */
  it("o modal da conta envia google.id", async () => {
    const source = await readFile(
      path.join(process.cwd(), "components/app/account-modal.tsx"),
      "utf8"
    );
    expect(source).toContain("accountId: google.id");
    expect(source).not.toContain("accountId: google.accountId");
  });
});
