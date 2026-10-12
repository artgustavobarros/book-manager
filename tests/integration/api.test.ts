import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as verificationRoute from "@/app/api/account/verification/route";
import * as bookById from "@/app/api/books/[id]/route";
import * as importRoute from "@/app/api/books/import/route";
import * as booksRoute from "@/app/api/books/route";
import * as goalsRoute from "@/app/api/goals/[year]/route";
import * as settingsRoute from "@/app/api/settings/route";
import * as syncRoute from "@/app/api/sheet-sync/route";
import { db } from "@/lib/db";
import { books, user } from "@/lib/db/schema";
import { type Book, EMPTY_BOOK_FIELDS } from "@/lib/domain/types";
import { applyMerge } from "@/lib/services/books";
import backup from "@/tests/fixtures/reference-books.json";

import { setupTestDb } from "../support/db";
import { createUserSession, ctx, req } from "../support/session";

let ana: Awaited<ReturnType<typeof createUserSession>>;
let bia: Awaited<ReturnType<typeof createUserSession>>;

beforeAll(async () => {
  await setupTestDb();
  ana = await createUserSession("Ana Lima");
  bia = await createUserSession("Bia Souza");
});
afterEach(() => vi.unstubAllGlobals());

async function body<T = any>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

describe("autenticação da API", () => {
  it("responde 401 sem sessão", async () => {
    expect((await booksRoute.GET(req("/api/books"), ctx())).status).toBe(401);
    expect(
      (await goalsRoute.GET(req("/api/goals/2026"), ctx({ year: "2026" })))
        .status
    ).toBe(401);
  });

  it("consulta o estado atual de verificação só com sessão", async () => {
    expect(
      (await verificationRoute.GET(req("/api/account/verification"), ctx()))
        .status
    ).toBe(401);
    await db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, ana.userId));
    const pending = await verificationRoute.GET(
      req("/api/account/verification", { cookie: ana.cookie }),
      ctx()
    );
    expect(await body(pending)).toEqual({ emailVerified: false });
    expect(pending.headers.get("cache-control")).toContain("no-store");
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, ana.userId));
    expect(
      await body(
        await verificationRoute.GET(
          req("/api/account/verification", { cookie: ana.cookie }),
          ctx()
        )
      )
    ).toEqual({ emailVerified: true });
  });
});

describe("livros", () => {
  let created: Book;

  it("cria com o próximo nº e lista só os do usuário", async () => {
    const res = await booksRoute.POST(
      req("/api/books", {
        method: "POST",
        cookie: ana.cookie,
        json: { title: "Torto arado", pages: 264 },
      }),
      ctx()
    );
    expect(res.status).toBe(201);
    created = (await body(res)).book;
    expect(created).toMatchObject({
      title: "Torto arado",
      pages: 264,
      orderNo: 1,
      status: "nao-lido",
      favorite: false,
    });

    const second = await body(
      await booksRoute.POST(
        req("/api/books", {
          method: "POST",
          cookie: ana.cookie,
          json: { title: "Outro" },
        }),
        ctx()
      )
    );
    expect(second.book.orderNo).toBe(2);

    const list = await body(
      await booksRoute.GET(req("/api/books", { cookie: ana.cookie }), ctx())
    );
    expect(list.books.map((b: Book) => b.title)).toEqual([
      "Torto arado",
      "Outro",
    ]);
    const other = await body(
      await booksRoute.GET(req("/api/books", { cookie: bia.cookie }), ctx())
    );
    expect(other.books).toEqual([]);
  });

  it("valida o payload", async () => {
    const res = await booksRoute.POST(
      req("/api/books", {
        method: "POST",
        cookie: ana.cookie,
        json: { title: "X", pages: 0 },
      }),
      ctx()
    );
    expect(res.status).toBe(400);
    expect((await body(res)).error).toBe(
      "Páginas: precisa ser maior que zero."
    );
    const empty = await booksRoute.POST(
      req("/api/books", {
        method: "POST",
        cookie: ana.cookie,
        json: { title: " " },
      }),
      ctx()
    );
    expect(empty.status).toBe(400);
  });

  it("atualiza e limpa 'emprestado para' ao sair do empréstimo", async () => {
    const patch = (json: unknown, cookie = ana.cookie, id = created.id) =>
      bookById.PATCH(
        req(`/api/books/${id}`, { method: "PATCH", cookie, json }),
        ctx({ id })
      );
    const lent = await body(
      await patch({ status: "emprestado", borrower: "Rafael" })
    );
    expect(lent.book).toMatchObject({
      status: "emprestado",
      borrower: "Rafael",
    });
    const back = await body(await patch({ status: "lido", yearRead: 2026 }));
    expect(back.book).toMatchObject({
      status: "lido",
      borrower: null,
      yearRead: 2026,
    });
  });

  it("isola livros de outros usuários (404)", async () => {
    const res = await bookById.PATCH(
      req(`/api/books/${created.id}`, {
        method: "PATCH",
        cookie: bia.cookie,
        json: { title: "hack" },
      }),
      ctx({ id: created.id })
    );
    expect(res.status).toBe(404);
    const del = await bookById.DELETE(
      req(`/api/books/${created.id}`, { method: "DELETE", cookie: bia.cookie }),
      ctx({ id: created.id })
    );
    expect(del.status).toBe(404);
    expect(
      (
        await bookById.DELETE(
          req("/api/books/abc", { method: "DELETE", cookie: ana.cookie }),
          ctx({ id: "abc" })
        )
      ).status
    ).toBe(404);
  });

  it("atualiza em lote ignorando ids de outros usuários", async () => {
    const biaBook = (
      await body(
        await booksRoute.POST(
          req("/api/books", {
            method: "POST",
            cookie: bia.cookie,
            json: { title: "Da Bia" },
          }),
          ctx()
        )
      )
    ).book;
    const res = await body(
      await booksRoute.PATCH(
        req("/api/books", {
          method: "PATCH",
          cookie: ana.cookie,
          json: [
            {
              id: created.id,
              coverUrl: "https://capa/1.jpg",
              coverCheckedAt: "2026-06-15T12:00:00.000Z",
            },
            { id: biaBook.id, coverUrl: "https://hack" },
          ],
        }),
        ctx()
      )
    );
    expect(res.books).toHaveLength(1);
    expect(res.books[0].coverUrl).toBe("https://capa/1.jpg");
    const biaList = await body(
      await booksRoute.GET(req("/api/books", { cookie: bia.cookie }), ctx())
    );
    expect(biaList.books[0].coverUrl).toBeNull();
  });

  it("exclui", async () => {
    const res = await bookById.DELETE(
      req(`/api/books/${created.id}`, { method: "DELETE", cookie: ana.cookie }),
      ctx({ id: created.id })
    );
    expect(res.status).toBe(204);
  });
});

describe("início do empréstimo", () => {
  const PAST = new Date("2026-05-01T12:00:00.000Z");
  const recent = (iso: string | null) =>
    iso !== null && Math.abs(Date.now() - new Date(iso).getTime()) < 60_000;
  const create = async (json: Record<string, unknown>) =>
    (
      await body<{ book: Book }>(
        await booksRoute.POST(
          req("/api/books", { method: "POST", cookie: ana.cookie, json }),
          ctx()
        )
      )
    ).book;
  const patch = async (id: string, json: unknown) =>
    (
      await body<{ book: Book }>(
        await bookById.PATCH(
          req(`/api/books/${id}`, {
            method: "PATCH",
            cookie: ana.cookie,
            json,
          }),
          ctx({ id })
        )
      )
    ).book;
  /** Simula um empréstimo antigo. */
  const backdate = (id: string) =>
    db.update(books).set({ lentAt: PAST }).where(eq(books.id, id));

  it("grava ao emprestar e limpa ao devolver", async () => {
    const b = await create({ title: "Água viva" });
    expect(b.lentAt).toBeNull();
    const lent = await patch(b.id, { status: "emprestado", borrower: "Caio" });
    expect(recent(lent.lentAt)).toBe(true);
    const back = await patch(b.id, { status: "lido" });
    expect(back.lentAt).toBeNull();
  });

  it("outras edições não reiniciam o empréstimo", async () => {
    const b = await create({ title: "Vidas secas" });
    await patch(b.id, { status: "emprestado", borrower: "Caio" });
    await backdate(b.id);
    for (const json of [
      { favorite: true },
      { notes: "Cobrar em junho" },
      { coverCheckedAt: "2026-06-15T12:00:00.000Z" },
      { borrower: "Caio Prado" },
      { status: "emprestado", borrower: "Caio Prado" },
    ]) {
      expect((await patch(b.id, json)).lentAt).toBe(PAST.toISOString());
    }
  });

  it("reemprestar depois da devolução grava um novo início", async () => {
    const b = await create({ title: "Macunaíma" });
    await patch(b.id, { status: "emprestado", borrower: "Caio" });
    await backdate(b.id);
    await patch(b.id, { status: "nao-lido" });
    const again = await patch(b.id, { status: "emprestado", borrower: "Lia" });
    expect(recent(again.lentAt)).toBe(true);
  });

  it("criar já emprestado grava o início", async () => {
    const b = await create({
      title: "Capitães da areia",
      status: "emprestado",
      borrower: "Lia",
    });
    expect(recent(b.lentAt)).toBe(true);
  });

  it("ignora lentAt vindo do cliente", async () => {
    const b = await create({
      title: "Iracema",
      status: "emprestado",
      borrower: "Lia",
      lentAt: "2020-01-01T00:00:00.000Z",
    });
    expect(recent(b.lentAt)).toBe(true);
    await backdate(b.id);
    const only = await bookById.PATCH(
      req(`/api/books/${b.id}`, {
        method: "PATCH",
        cookie: ana.cookie,
        json: { lentAt: "2020-01-01T00:00:00.000Z" },
      }),
      ctx({ id: b.id })
    );
    expect(only.status).toBe(400);
    const edited = await patch(b.id, {
      notes: "x",
      lentAt: "2020-01-01T00:00:00.000Z",
    });
    expect(edited.lentAt).toBe(PAST.toISOString());
    const plain = await create({
      title: "Senhora",
      lentAt: "2020-01-01T00:00:00.000Z",
    });
    expect(plain.lentAt).toBeNull();
  });

  it("segue as mesmas regras no lote", async () => {
    const kept = await create({ title: "O cortiço" });
    await patch(kept.id, { status: "emprestado", borrower: "Caio" });
    await backdate(kept.id);
    const fresh = await create({ title: "Dom Casmurro" });
    const res = await body<{ books: Book[] }>(
      await booksRoute.PATCH(
        req("/api/books", {
          method: "PATCH",
          cookie: ana.cookie,
          json: [
            { id: kept.id, coverUrl: "https://capa/2.jpg" },
            { id: fresh.id, status: "emprestado", borrower: "Lia" },
          ],
        }),
        ctx()
      )
    );
    const byId = new Map(res.books.map((b) => [b.id, b]));
    expect(byId.get(kept.id)?.lentAt).toBe(PAST.toISOString());
    expect(recent(byId.get(fresh.id)?.lentAt ?? null)).toBe(true);
  });

  it("segue as mesmas regras no merge da planilha", async () => {
    const kept = await create({ title: "A hora da estrela" });
    await patch(kept.id, { status: "emprestado", borrower: "Caio" });
    await backdate(kept.id);
    const fresh = await create({ title: "Sagarana" });
    const back = await create({ title: "Quincas Borba" });
    await patch(back.id, { status: "emprestado", borrower: "Lia" });
    await applyMerge(db, ana.userId, {
      updates: [
        {
          id: kept.id,
          fields: { status: "emprestado", notes: "via planilha" },
        },
        { id: fresh.id, fields: { status: "emprestado" } },
        { id: back.id, fields: { status: "lido" } },
      ],
      inserts: [
        {
          ...EMPTY_BOOK_FIELDS,
          title: "Nova emprestada",
          status: "emprestado",
        },
      ],
    });
    const list = (
      await body<{ books: Book[] }>(
        await booksRoute.GET(req("/api/books", { cookie: ana.cookie }), ctx())
      )
    ).books;
    const byTitle = new Map(list.map((b) => [b.title, b]));
    expect(byTitle.get("A hora da estrela")?.lentAt).toBe(PAST.toISOString());
    expect(recent(byTitle.get("Sagarana")?.lentAt ?? null)).toBe(true);
    expect(byTitle.get("Quincas Borba")?.lentAt).toBeNull();
    expect(recent(byTitle.get("Nova emprestada")?.lentAt ?? null)).toBe(true);
  });
});

describe("importar backup", () => {
  const importAs = (cookie: string | undefined, json: unknown) =>
    importRoute.POST(
      req("/api/books/import", { method: "POST", cookie, json }),
      ctx()
    );
  const booksOf = async (cookie: string) =>
    (
      await body<{ books: Book[] }>(
        await booksRoute.GET(req("/api/books", { cookie }), ctx())
      )
    ).books;

  it("substitui o acervo pelo backup do standalone", async () => {
    const res = await body(
      await importRoute.POST(
        req("/api/books/import", {
          method: "POST",
          cookie: ana.cookie,
          json: backup,
        }),
        ctx()
      )
    );
    expect(res.count).toBe(30);
    expect(res.books).toHaveLength(30);
    expect(res.books[0]).toMatchObject({
      title: "1984",
      pages: 416,
      orderNo: 1,
    });
  });
  it("rejeita o que não é array", async () => {
    const res = await importRoute.POST(
      req("/api/books/import", {
        method: "POST",
        cookie: ana.cookie,
        json: { x: 1 },
      }),
      ctx()
    );
    expect(res.status).toBe(400);
  });
  it("rejeita backup sem livros válidos sem apagar o acervo", async () => {
    const count = async () =>
      (
        await body<{ books: Book[] }>(
          await booksRoute.GET(req("/api/books", { cookie: ana.cookie }), ctx())
        )
      ).books.length;
    await importRoute.POST(
      req("/api/books/import", {
        method: "POST",
        cookie: ana.cookie,
        json: backup,
      }),
      ctx()
    );
    expect(await count()).toBe(30);
    for (const json of [[], [{}], [{ foo: 1 }, { bar: 2 }]]) {
      const res = await importRoute.POST(
        req("/api/books/import", { method: "POST", cookie: ana.cookie, json }),
        ctx()
      );
      expect(res.status).toBe(400);
    }
    expect(await count()).toBe(30);
  });

  it("não toca no acervo de outro usuário", async () => {
    await booksRoute.POST(
      req("/api/books", {
        method: "POST",
        cookie: bia.cookie,
        json: { title: "Quarto de despejo" },
      }),
      ctx()
    );
    const before = await booksOf(bia.cookie);
    expect(before.length).toBeGreaterThan(0);
    expect((await importAs(ana.cookie, backup)).status).toBe(200);
    expect(await booksOf(bia.cookie)).toEqual(before);
  });

  it("reimportar o mesmo backup não duplica", async () => {
    await importAs(ana.cookie, backup);
    const res = await body(await importAs(ana.cookie, backup));
    expect(res.count).toBe(30);
    const orders = (await booksOf(ana.cookie)).map((b) => b.orderNo);
    expect(orders).toHaveLength(30);
    expect(new Set(orders).size).toBe(30);
    expect(Math.min(...(orders as number[]))).toBe(1);
    expect(Math.max(...(orders as number[]))).toBe(30);
  });

  it("numera a partir de 1 um backup sem nº, mesmo com acervo anterior", async () => {
    await importAs(ana.cookie, backup);
    const res = await importAs(ana.cookie, [
      { title: "Sem nº A", acquired: "2024-01-01" },
      { title: "Sem nº B", acquired: "2024-02-01" },
    ]);
    expect(res.status).toBe(200);
    const books = await booksOf(ana.cookie);
    expect(books.map((b) => [b.title, b.orderNo])).toEqual(
      expect.arrayContaining([
        ["Sem nº A", 1],
        ["Sem nº B", 2],
      ])
    );
    expect(books).toHaveLength(2);
  });

  it("rejeita mais de 20000 itens sem apagar o acervo", async () => {
    await importAs(ana.cookie, backup);
    const huge = Array.from({ length: 20_001 }, () => ({ title: "x" }));
    expect((await importAs(ana.cookie, huge)).status).toBe(400);
    expect(await booksOf(ana.cookie)).toHaveLength(30);
  });

  it("exige sessão", async () => {
    await importAs(ana.cookie, backup);
    expect((await importAs(undefined, [{ title: "Intruso" }])).status).toBe(
      401
    );
    expect(await booksOf(ana.cookie)).toHaveLength(30);
  });

  it("restaura o início do empréstimo do backup", async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000).toISOString();
    const res = await importAs(ana.cookie, [
      {
        title: "Com data",
        status: "emprestado",
        borrower: "Ana",
        lentAt: twentyDaysAgo,
      },
      { title: "Sem data", status: "emprestado", borrower: "Bia" },
      { title: "Devolvido", status: "lido", lentAt: twentyDaysAgo },
    ]);
    expect(res.status).toBe(200);
    const byTitle = new Map(
      (await booksOf(ana.cookie)).map((b) => [b.title, b])
    );
    expect(byTitle.get("Com data")?.lentAt).toBe(twentyDaysAgo);
    const restoredAt = byTitle.get("Sem data")?.lentAt;
    expect(Date.now() - new Date(restoredAt ?? 0).getTime()).toBeLessThan(
      60_000
    );
    expect(byTitle.get("Devolvido")?.lentAt).toBeNull();
  });

  it("descarta números fora da faixa em vez de falhar", async () => {
    const res = await importAs(ana.cookie, [
      { title: "Páginas demais", author: "Fulana", pages: "99999999999" },
    ]);
    expect(res.status).toBe(200);
    const [book] = await booksOf(ana.cookie);
    expect(book).toMatchObject({
      title: "Páginas demais",
      author: "Fulana",
      pages: null,
      orderNo: 1,
    });
  });
});

describe("metas", () => {
  it("usa 24 por padrão e persiste por ano", async () => {
    const get = (y: string) =>
      goalsRoute.GET(
        req(`/api/goals/${y}`, { cookie: ana.cookie }),
        ctx({ year: y })
      );
    expect(await body(await get("2026"))).toEqual({ year: 2026, target: 24 });
    await goalsRoute.PUT(
      req("/api/goals/2026", {
        method: "PUT",
        cookie: ana.cookie,
        json: { target: 25 },
      }),
      ctx({ year: "2026" })
    );
    expect((await body(await get("2026"))).target).toBe(25);
    expect((await body(await get("2027"))).target).toBe(24);
    expect((await get("abc")).status).toBe(404);
    const bad = await goalsRoute.PUT(
      req("/api/goals/2026", {
        method: "PUT",
        cookie: ana.cookie,
        json: { target: 0 },
      }),
      ctx({ year: "2026" })
    );
    expect(bad.status).toBe(400);
  });

  const getGoal = (cookie: string, y: string) =>
    goalsRoute.GET(req(`/api/goals/${y}`, { cookie }), ctx({ year: y }));
  const putGoal = (cookie: string, y: string, target: unknown) =>
    goalsRoute.PUT(
      req(`/api/goals/${y}`, { method: "PUT", cookie, json: { target } }),
      ctx({ year: y })
    );
  const targetOf = async (cookie: string, y: string) =>
    (await body<{ target: number }>(await getGoal(cookie, y))).target;

  it("isola a meta de cada usuário no mesmo ano", async () => {
    expect((await putGoal(ana.cookie, "2030", 50)).status).toBe(200);
    expect(await targetOf(bia.cookie, "2030")).toBe(24);
    expect((await putGoal(bia.cookie, "2030", 7)).status).toBe(200);
    expect(await targetOf(ana.cookie, "2030")).toBe(50);
    expect(await targetOf(bia.cookie, "2030")).toBe(7);
  });

  it("aceita metas de 1 a 1000 e rejeita o resto sem alterar a meta", async () => {
    for (const target of [1, 1000]) {
      expect((await putGoal(ana.cookie, "2031", target)).status).toBe(200);
      expect(await targetOf(ana.cookie, "2031")).toBe(target);
    }
    for (const target of [0, 1001, 1.5]) {
      expect((await putGoal(ana.cookie, "2031", target)).status).toBe(400);
    }
    expect(await targetOf(ana.cookie, "2031")).toBe(1000);
  });

  it("aceita anos de 1000 a 9999 e responde 404 fora disso", async () => {
    for (const y of ["1000", "9999"]) {
      expect((await getGoal(ana.cookie, y)).status).toBe(200);
      expect((await putGoal(ana.cookie, y, 10)).status).toBe(200);
    }
    for (const y of ["999", "10000"]) {
      expect((await getGoal(ana.cookie, y)).status).toBe(404);
      expect((await putGoal(ana.cookie, y, 10)).status).toBe(404);
    }
  });
});

describe("planilha", () => {
  it("rejeita link que não é do Google Sheets", async () => {
    const res = await syncRoute.POST(
      req("/api/sheet-sync", {
        method: "POST",
        cookie: bia.cookie,
        json: { sheetUrl: "https://evil.com/x" },
      }),
      ctx()
    );
    expect(res.status).toBe(400);
  });

  it("sincroniza e salva a URL", async () => {
    const csv =
      "Título;Autor;Status\nDa Bia;;Lido\nNovo da planilha;Fulana;Não lido";
    const fetchMock = vi.fn(async () => new Response(csv, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0";
    const res = await body(
      await syncRoute.POST(
        req("/api/sheet-sync", {
          method: "POST",
          cookie: bia.cookie,
          json: { sheetUrl: url },
        }),
        ctx()
      )
    );
    expect(res).toMatchObject({
      updated: 1,
      added: 1,
      message: "Sincronizado: 1 livros atualizados e 1 novos.",
    });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      "https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&gid=0"
    );
    expect(
      await body(
        await settingsRoute.GET(
          req("/api/settings", { cookie: bia.cookie }),
          ctx()
        )
      )
    ).toEqual({ sheetUrl: url });
  });

  it("planilha privada (HTML) devolve a orientação sem alterar nada", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response("<!DOCTYPE html><html>login</html>", { status: 200 })
    );
    const res = await syncRoute.POST(
      req("/api/sheet-sync", { method: "POST", cookie: bia.cookie, json: {} }),
      ctx()
    );
    expect(res.status).toBe(422);
    expect((await body(res)).error).toContain("Qualquer pessoa com o link");
  });
});
