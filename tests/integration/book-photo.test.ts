import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/books/recognize/route";
import type { DB } from "@/lib/db";
import { books, rateLimit } from "@/lib/db/schema";
import { PHOTO_MODELS } from "@/lib/domain/book-photo";
import { recognizeBookPhoto } from "@/lib/services/book-photo";

import { PHOTO_DATA_URL } from "../fixtures/book-photo";
import { setupTestDb } from "../support/db";
import { createUserSession, ctx, req } from "../support/session";

const config = vi.hoisted(() => ({
  apiKey: "test-key-not-a-secret" as string | undefined,
}));
vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return {
    env: {
      ...original.env,
      OPENROUTER_PHOTO_DAILY_LIMIT: 45,
      get OPENROUTER_API_KEY() {
        return config.apiKey;
      },
    },
  };
});
vi.mock("@/lib/services/book-photo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/book-photo")>()),
  recognizeBookPhoto: vi.fn(),
}));

let database: DB;
beforeAll(async () => {
  database = await setupTestDb();
});
beforeEach(async () => {
  config.apiKey = "test-key-not-a-secret";
  vi.mocked(recognizeBookPhoto)
    .mockReset()
    .mockResolvedValue({
      reading: {
        title: "Torto arado",
        author: "Itamar Vieira Junior",
        isbn: null,
      },
      model: PHOTO_MODELS[0].value,
      elapsedMs: 100,
    });
  await database.delete(rateLimit);
});

function post(
  cookie?: string,
  body: unknown = { image: PHOTO_DATA_URL, model: PHOTO_MODELS[0].value }
) {
  return POST(
    req("/api/books/recognize", { method: "POST", cookie, json: body }),
    ctx()
  );
}

describe("identificação por foto autenticada", () => {
  it("recusa acesso sem sessão antes de chamar o provedor", async () => {
    expect((await post()).status).toBe(401);
    expect(recognizeBookPhoto).not.toHaveBeenCalled();
  });

  it("retorna pistas sem criar livro", async () => {
    const session = await createUserSession();
    const before = await database.select().from(books);
    const response = await post(session.cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      reading: { title: "Torto arado" },
    });
    expect(await database.select().from(books)).toEqual(before);
    expect(recognizeBookPhoto).toHaveBeenCalledOnce();
  });

  it("recusa modelo pago e imagem remota antes do provedor", async () => {
    const session = await createUserSession();
    expect(
      (
        await post(session.cookie, {
          image: PHOTO_DATA_URL,
          model: "openai/gpt-5",
        })
      ).status
    ).toBe(400);
    expect(
      (
        await post(session.cookie, {
          image: "https://example.com/photo.png",
          model: PHOTO_MODELS[0].value,
        })
      ).status
    ).toBe(400);
    expect(recognizeBookPhoto).not.toHaveBeenCalled();
  });

  it("funciona como recurso opcional quando a chave não está configurada", async () => {
    const session = await createUserSession();
    config.apiKey = undefined;
    expect((await post(session.cookie)).status).toBe(503);
    expect(recognizeBookPhoto).not.toHaveBeenCalled();
  });

  it("limita a pessoa a cinco tentativas por minuto", async () => {
    const session = await createUserSession();
    for (let i = 0; i < 5; i++) {
      expect((await post(session.cookie)).status).toBe(200);
    }
    const limited = await post(session.cookie);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(recognizeBookPhoto).toHaveBeenCalledTimes(5);
  });

  it.each([
    ["book-photo-minute:shared", 18],
    ["book-photo-daily:shared", 45],
  ])("respeita cota compartilhada %s", async (key, count) => {
    const session = await createUserSession();
    await database
      .insert(rateLimit)
      .values({ id: key, key, count, lastRequest: Date.now() });
    expect((await post(session.cookie)).status).toBe(429);
    expect(recognizeBookPhoto).not.toHaveBeenCalled();
  });
});
