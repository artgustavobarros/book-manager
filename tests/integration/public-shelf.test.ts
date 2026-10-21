import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import * as route from "@/app/api/public-shelf/route";
import * as ogRoute from "@/app/og/estante/[slug]/route";
import { db } from "@/lib/db";
import { books, user } from "@/lib/db/schema";
import { fetchCoverDataUrl, isFetchableCover } from "@/lib/services/og-covers";
import {
  findPublicShelf,
  listPublicBooks,
  publicShelfStamp,
  setPublished,
  UnverifiedEmailError,
} from "@/lib/services/public-shelf";

import { setupTestDb } from "../support/db";
import { createUserSession, ctx, req } from "../support/session";

beforeAll(async () => {
  await setupTestDb();
});

async function addBook(
  userId: string,
  values: Partial<typeof books.$inferInsert>
) {
  await db.insert(books).values({ userId, title: "Livro", ...values });
}

describe("publicação da estante", () => {
  it("gera o slug do nome, resolve colisões e mantém o slug", async () => {
    const a = await createUserSession("Ana Júlia Conceição");
    const b = await createUserSession("Ana Júlia Conceição");
    expect(await setPublished(db, a.userId, true)).toEqual({
      enabled: true,
      slug: "ana-julia-conceicao",
    });
    expect((await setPublished(db, b.userId, true)).slug).toBe(
      "ana-julia-conceicao-2"
    );

    await db
      .update(user)
      .set({ name: "Ana J. Souza" })
      .where(eq(user.id, a.userId));
    expect(await setPublished(db, a.userId, false)).toEqual({
      enabled: false,
      slug: "ana-julia-conceicao",
    });
    expect(await findPublicShelf(db, "ana-julia-conceicao")).toBeNull();
    expect((await setPublished(db, a.userId, true)).slug).toBe(
      "ana-julia-conceicao"
    );
    const shelf = await findPublicShelf(db, "ana-julia-conceicao");
    expect(shelf?.owner.name).toBe("Ana J. Souza");
    expect(await findPublicShelf(db, "nao-existe")).toBeNull();
  });

  it("recusa publicar com e-mail pendente, mas deixa despublicar", async () => {
    const c = await createUserSession("Caio");
    await db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, c.userId));
    await expect(setPublished(db, c.userId, true)).rejects.toBeInstanceOf(
      UnverifiedEmailError
    );
    expect(await setPublished(db, c.userId, false)).toEqual({
      enabled: false,
      slug: null,
    });
  });
});

describe("projeção pública", () => {
  it("só traz os campos públicos e exclui doados", async () => {
    const d = await createUserSession("Dora");
    await addBook(d.userId, {
      title: "Kindred",
      author: "Octavia E. Butler",
      status: "emprestado",
      borrower: "Carla",
      notes: "anotação secreta",
      acquiredOn: "2020-01-01",
      favorite: true,
      yearRead: 2021,
      nationality: "estadunidense",
    });
    await addBook(d.userId, { title: "Doado", status: "doado" });
    const list = await listPublicBooks(db, d.userId);
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]).sort()).toEqual([
      "author",
      "coverUrl",
      "genre",
      "id",
      "pages",
      "publisher",
      "status",
      "title",
      "yearPublished",
    ]);
    expect(JSON.stringify(list)).not.toMatch(
      /Carla|secreta|2020-01-01|estadunidense/
    );
    expect((await publicShelfStamp(db, d.userId)).count).toBe(1);
  });
});

describe("PUT /api/public-shelf", () => {
  it("exige sessão, valida o corpo e devolve o estado", async () => {
    expect(
      (
        await route.PUT(
          req("/api/public-shelf", { method: "PUT", json: { enabled: true } }),
          ctx()
        )
      ).status
    ).toBe(401);
    const e = await createUserSession("Eva Lins");
    expect(
      (
        await route.PUT(
          req("/api/public-shelf", {
            method: "PUT",
            cookie: e.cookie,
            json: {},
          }),
          ctx()
        )
      ).status
    ).toBe(400);
    const ok = await route.PUT(
      req("/api/public-shelf", {
        method: "PUT",
        cookie: e.cookie,
        json: { enabled: true },
      }),
      ctx()
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ enabled: true, slug: "eva-lins" });
  });

  it("responde 403 com e-mail pendente", async () => {
    const f = await createUserSession("Fábio");
    await db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, f.userId));
    const res = await route.PUT(
      req("/api/public-shelf", {
        method: "PUT",
        cookie: f.cookie,
        json: { enabled: true },
      }),
      ctx()
    );
    expect(res.status).toBe(403);
  });
});

describe("imagem OG da estante", () => {
  it("gera PNG 1200×630 sem sessão e 404 para estante privada", async () => {
    const g = await createUserSession("Gil Reis");
    await addBook(g.userId, {
      title: "Kindred",
      genre: "Romance",
      coverUrl: "https://127.0.0.1/capa.jpg",
    });
    await setPublished(db, g.userId, true);
    const ok = await ogRoute.GET(
      req("/og/estante/gil-reis?genero=romance&v=1"),
      ctx({ slug: "gil-reis" })
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    expect(ok.headers.get("cache-control")).toContain("s-maxage");
    const png = Buffer.from(await ok.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);

    const book = await ogRoute.GET(
      req("/og/estante/gil-reis?livro=x"),
      ctx({ slug: "gil-reis" })
    );
    expect(book.status).toBe(200);

    await setPublished(db, g.userId, false);
    const gone = await ogRoute.GET(
      req("/og/estante/gil-reis"),
      ctx({ slug: "gil-reis" })
    );
    expect(gone.status).toBe(404);
    expect(gone.headers.get("cache-control")).toBe("no-store");
  });
});

describe("capas remotas da OG", () => {
  it("só busca https fora da rede interna", () => {
    expect(isFetchableCover("https://books.google.com/x.jpg")).toBe(true);
    expect(isFetchableCover("http://books.google.com/x.jpg")).toBe(false);
    expect(isFetchableCover("https://localhost/x.jpg")).toBe(false);
    expect(isFetchableCover("https://10.0.0.2/x.jpg")).toBe(false);
    expect(isFetchableCover("https://169.254.169.254/latest")).toBe(false);
    expect(isFetchableCover("https://[::1]/x.jpg")).toBe(false);
    expect(isFetchableCover("javascript:alert(1)")).toBe(false);
  });

  it("vira data URL ou null em falha, tipo errado, excesso ou atraso", async () => {
    const img = (type: string, size = 4) =>
      (async () =>
        new Response(new Uint8Array(size), {
          headers: { "content-type": type },
        })) as typeof fetch;
    expect(
      await fetchCoverDataUrl("http://c.com/a.jpg", img("image/jpeg"))
    ).toBe("data:image/jpeg;base64,AAAAAA==");
    expect(
      await fetchCoverDataUrl("https://c.com/a", img("text/html"))
    ).toBeNull();
    expect(
      await fetchCoverDataUrl("https://c.com/a", img("image/png", 2_000_000))
    ).toBeNull();
    const boom = (async () => {
      throw new Error("timeout");
    }) as typeof fetch;
    expect(await fetchCoverDataUrl("https://c.com/a", boom)).toBeNull();
    expect(await fetchCoverDataUrl(null)).toBeNull();
  });
});
