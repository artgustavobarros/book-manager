import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth";
import type { DB } from "@/lib/db";
import { account, user } from "@/lib/db/schema";

import { setupTestDb } from "../support/db";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function localUser(image: string | null = null) {
  const id = crypto.randomUUID();
  const email = `${id}@exemplo.com`;
  await db.insert(user).values({
    id,
    name: "Nome local",
    email,
    emailVerified: true,
    image,
  });
  return { id, email };
}

function googleProfile(sub: string, picture?: string) {
  return vi.fn().mockResolvedValue(Response.json({ sub, picture }));
}

describe("avatar da conta Google", () => {
  it("persiste a imagem no primeiro cadastro OAuth", async () => {
    const accountId = crypto.randomUUID();
    vi.stubGlobal(
      "fetch",
      googleProfile(accountId, "https://lh3.googleusercontent.com/novo")
    );
    const context = await auth.$context;
    const created = await context.internalAdapter.createOAuthUser(
      {
        name: "Pessoa Google",
        email: `${accountId}@exemplo.com`,
        emailVerified: true,
        image: "https://lh3.googleusercontent.com/novo",
      },
      { providerId: "google", accountId, accessToken: "token-google" }
    );

    const [saved] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(saved.image).toBe("https://lh3.googleusercontent.com/novo");
    expect(saved.emailVerified).toBe(true);
  });

  it("atualiza somente a foto ao criar um vínculo Google para conta local", async () => {
    const local = await localUser();
    const accountId = crypto.randomUUID();
    const fetcher = googleProfile(
      accountId,
      "https://lh3.googleusercontent.com/vinculado"
    );
    vi.stubGlobal("fetch", fetcher);

    await (await auth.$context).internalAdapter.createAccount({
      providerId: "google",
      accountId,
      userId: local.id,
      accessToken: "token-google",
    });

    const [saved] = await db.select().from(user).where(eq(user.id, local.id));
    expect(saved).toMatchObject({
      email: local.email,
      name: "Nome local",
      image: "https://lh3.googleusercontent.com/vinculado",
    });
    expect(
      await db.select().from(account).where(eq(account.userId, local.id))
    ).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("preserva a foto anterior quando o Google não fornece foto válida", async () => {
    const local = await localUser("https://example.com/anterior.png");
    const accountId = crypto.randomUUID();
    vi.stubGlobal(
      "fetch",
      googleProfile(accountId, "http://example.com/insegura.png")
    );

    await (await auth.$context).internalAdapter.createAccount({
      providerId: "google",
      accountId,
      userId: local.id,
      accessToken: "token-google",
    });

    const [saved] = await db.select().from(user).where(eq(user.id, local.id));
    expect(saved.image).toBe("https://example.com/anterior.png");
  });

  it("não associa a foto de outra conta Google", async () => {
    const local = await localUser("https://example.com/anterior.png");
    vi.stubGlobal(
      "fetch",
      googleProfile("outro-google", "https://example.com/outra.png")
    );

    await (await auth.$context).internalAdapter.createAccount({
      providerId: "google",
      accountId: crypto.randomUUID(),
      userId: local.id,
      accessToken: "token-google",
    });
    const [saved] = await db.select().from(user).where(eq(user.id, local.id));
    expect(saved.image).toBe("https://example.com/anterior.png");
  });

  it("falha ao consultar o Google não impede o vínculo nem apaga a foto", async () => {
    const local = await localUser("https://example.com/intacta.png");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("indisponível"))
    );

    await (await auth.$context).internalAdapter.createAccount({
      providerId: "google",
      accountId: crypto.randomUUID(),
      userId: local.id,
      accessToken: "token-google",
    });

    const [untouched] = await db
      .select()
      .from(user)
      .where(eq(user.id, local.id));
    expect(untouched.image).toBe("https://example.com/intacta.png");
    expect(
      await db.select().from(account).where(eq(account.userId, local.id))
    ).toHaveLength(1);
  });

  it("cancelar o OAuth não altera a foto nem cria vínculo", async () => {
    const local = await localUser("https://example.com/intacta.png");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const oauth = betterAuth({
      ...auth.options,
      socialProviders: {
        google: { clientId: "teste", clientSecret: "teste" },
      },
    });
    const signIn = await oauth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ provider: "google", callbackURL: "/" }),
      })
    );
    expect(signIn.status).toBe(200);
    const { url } = (await signIn.json()) as { url: string };
    const state = new URL(url).searchParams.get("state");
    expect(state).toBeTruthy();
    const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    await oauth.handler(
      new Request(
        `http://localhost:3000/api/auth/callback/google?error=access_denied&state=${state}`,
        { headers: { cookie: cookie! } }
      )
    );

    const [saved] = await db.select().from(user).where(eq(user.id, local.id));
    expect(saved.image).toBe("https://example.com/intacta.png");
    expect(
      await db.select().from(account).where(eq(account.userId, local.id))
    ).toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
