import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import * as route from "@/app/api/public-shelf/route";
import * as ogRoute from "@/app/og/estante/[slug]/route";
import { db } from "@/lib/db";
import { books, user, userSettings } from "@/lib/db/schema";
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

// Cada renderização da OG busca as capas: o número de buscas mede o trabalho feito.
vi.mock("@/lib/services/og-covers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/services/og-covers")>();
  return { ...actual, fetchCoverDataUrl: vi.fn(actual.fetchCoverDataUrl) };
});

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

  it("não troca um slug criado entre a leitura e a gravação", async () => {
    const owner = await createUserSession("Lia Corrida");
    await setPublished(db, owner.userId, true);
    // Simula a leitura antiga da segunda publicação, após a primeira ter gravado.
    const staleReadDb = new Proxy(db, {
      get(target, property) {
        if (property !== "select") {
          return Reflect.get(target, property);
        }
        return (...args: unknown[]) => {
          const fields = args[0] as Record<string, unknown> | undefined;
          if (fields && "enabled" in fields && "slug" in fields) {
            return { from: () => ({ where: async () => [] }) };
          }
          return db.select(...(args as Parameters<typeof db.select>));
        };
      },
    });
    expect((await setPublished(staleReadDb, owner.userId, true)).slug).toBe(
      "lia-corrida"
    );
    const [saved] = await db
      .select({ slug: userSettings.publicSlug })
      .from(userSettings)
      .where(eq(userSettings.userId, owner.userId));
    expect(saved.slug).toBe("lia-corrida");
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
  const renders = () => vi.mocked(fetchCoverDataUrl).mock.calls.length;
  const location = (res: Response) => res.headers.get("location") ?? "";

  /** Estante própria de cada teste, publicada com um livro com capa. */
  async function publishedShelf(name: string) {
    const owner = await createUserSession(name);
    await addBook(owner.userId, {
      title: "Kindred",
      genre: "Romance",
      coverUrl: "https://127.0.0.1/capa.jpg",
    });
    const { slug } = await setPublished(db, owner.userId, true);
    const og = (query: string, headers?: HeadersInit) =>
      ogRoute.GET(
        req(`/og/estante/${slug}${query}`, { headers }),
        ctx({ slug: slug as string })
      );
    const canonical = async (query = "?genero=romance&v=a") =>
      new URL(location(await og(query))).search;
    return { ...owner, slug, og, canonical };
  }

  it("gera PNG 1200×630 sem sessão só na URL canônica", async () => {
    const { slug, og } = await publishedShelf("Gil Reis");
    const toCanonical = await og("?v=a&genero=romance");
    expect(toCanonical.status).toBe(307);
    expect(toCanonical.headers.get("cache-control")).toBe("no-store");
    const url = new URL(location(toCanonical));
    expect(url.pathname).toBe(`/og/estante/${slug}`);
    expect(url.search).toMatch(/^\?genero=romance&v=\w+$/);

    const ok = await og(url.search);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await ok.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);

    expect(new URL(location(await og("?livro=x"))).search).toMatch(/^\?v=\w+$/);
  });

  it("imagem de um livro tem uma só URL, sem gênero nem status", async () => {
    const { userId, og } = await publishedShelf("Ivo Livro");
    const [book] = await listPublicBooks(db, userId);
    const res = await og(`?genero=romance&status=lido&livro=${book.id}&v=a`);
    expect(res.status).toBe(307);
    expect(new URL(location(res)).search).toMatch(
      new RegExp(`^\\?livro=${book.id}&v=\\w+$`)
    );
  });

  it("renderiza cada estado uma vez, mesmo com v arbitrário", async () => {
    const { og, canonical } = await publishedShelf("Hana Memo");
    const before = renders();
    for (const v of ["a", "b", "zzz", ""]) {
      expect((await og("?genero=romance&v=" + v)).status).toBe(307);
    }
    expect(renders()).toBe(before);

    const url = await canonical();
    const [first, second] = await Promise.all([og(url), og(url)]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect((await og(url)).status).toBe(200);
    expect(renders()).toBe(before + 1);

    const etag = first.headers.get("etag") ?? "";
    expect(etag).toMatch(/^"\w+"$/);
    for (const header of [etag, `W/${etag}`, `"outra", ${etag}`, "*"]) {
      expect((await og(url, { "if-none-match": header })).status).toBe(304);
    }
    expect((await og(url, { "if-none-match": '"outra"' })).status).toBe(200);
    expect(renders()).toBe(before + 1);
  });

  it("muda de versão quando o acervo público muda", async () => {
    const { userId, og, canonical } = await publishedShelf("Jade Nova");
    const old = await canonical();
    await addBook(userId, {
      title: "Parentesco",
      genre: "Romance",
      coverUrl: "https://127.0.0.1/outra.jpg",
    });
    const moved = await og(old);
    expect(moved.status).toBe(307);
    const next = new URL(location(moved)).search;
    expect(next).not.toBe(old);
    const before = renders();
    expect((await og(next)).status).toBe(200);
    expect(renders()).toBeGreaterThan(before);
  });

  it("deixa de servir a mesma URL quando a estante fica privada", async () => {
    const { userId, og, canonical } = await publishedShelf("Lea Privada");
    const url = await canonical();
    const shared = await og(url);
    expect(shared.status).toBe(200);
    // Caches podem guardar, mas precisam revalidar na origem antes de reusar.
    expect(shared.headers.get("cache-control")).toBe("public, no-cache");
    const etag = shared.headers.get("etag") ?? "";

    await setPublished(db, userId, false);
    for (const res of [
      await og(url),
      await og(url, { "if-none-match": etag }),
    ]) {
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
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

  it("segue redirecionamentos só para destinos permitidos", async () => {
    const hops = (routes: Record<string, string>) =>
      (async (url: string | URL | Request) => {
        const to = routes[String(url)];
        return to
          ? new Response(null, { status: 302, headers: { location: to } })
          : new Response(new Uint8Array(4), {
              headers: { "content-type": "image/jpeg" },
            });
      }) as typeof fetch;
    // Como a Open Library: capa → archive.org → servidor do arquivo.
    expect(
      await fetchCoverDataUrl(
        "https://covers.openlibrary.org/b/id/1-L.jpg",
        hops({
          "https://covers.openlibrary.org/b/id/1-L.jpg":
            "https://archive.org/download/x.jpg",
          "https://archive.org/download/x.jpg": "/view?file=x.jpg",
        })
      )
    ).toBe("data:image/jpeg;base64,AAAAAA==");
    expect(
      await fetchCoverDataUrl(
        "https://c.com/a",
        hops({ "https://c.com/a": "https://169.254.169.254/latest" })
      )
    ).toBeNull();
    const loop = hops({
      "https://c.com/1": "https://c.com/2",
      "https://c.com/2": "https://c.com/1",
    });
    expect(await fetchCoverDataUrl("https://c.com/1", loop)).toBeNull();
  });
});
