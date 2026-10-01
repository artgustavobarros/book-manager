import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import * as bookById from "@/app/api/books/[id]/route";
import * as importRoute from "@/app/api/books/import/route";
import * as booksRoute from "@/app/api/books/route";
import * as goalsRoute from "@/app/api/goals/[year]/route";
import * as settingsRoute from "@/app/api/settings/route";
import * as syncRoute from "@/app/api/sheet-sync/route";
import type { Book } from "@/lib/domain/types";
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
    expect((await goalsRoute.GET(req("/api/goals/2026"), ctx({ year: "2026" }))).status).toBe(401);
  });
});

describe("livros", () => {
  let created: Book;

  it("cria com o próximo nº e lista só os do usuário", async () => {
    const res = await booksRoute.POST(req("/api/books", { method: "POST", cookie: ana.cookie, json: { title: "Torto arado", pages: 264 } }), ctx());
    expect(res.status).toBe(201);
    created = (await body(res)).book;
    expect(created).toMatchObject({ title: "Torto arado", pages: 264, orderNo: 1, status: "nao-lido", favorite: false });

    const second = await body(await booksRoute.POST(req("/api/books", { method: "POST", cookie: ana.cookie, json: { title: "Outro" } }), ctx()));
    expect(second.book.orderNo).toBe(2);

    const list = await body(await booksRoute.GET(req("/api/books", { cookie: ana.cookie }), ctx()));
    expect(list.books.map((b: Book) => b.title)).toEqual(["Torto arado", "Outro"]);
    const other = await body(await booksRoute.GET(req("/api/books", { cookie: bia.cookie }), ctx()));
    expect(other.books).toEqual([]);
  });

  it("valida o payload", async () => {
    const res = await booksRoute.POST(req("/api/books", { method: "POST", cookie: ana.cookie, json: { title: "X", pages: 0 } }), ctx());
    expect(res.status).toBe(400);
    expect((await body(res)).error).toBe("Páginas: precisa ser maior que zero.");
    const empty = await booksRoute.POST(req("/api/books", { method: "POST", cookie: ana.cookie, json: { title: " " } }), ctx());
    expect(empty.status).toBe(400);
  });

  it("atualiza e limpa 'emprestado para' ao sair do empréstimo", async () => {
    const patch = (json: unknown, cookie = ana.cookie, id = created.id) =>
      bookById.PATCH(req(`/api/books/${id}`, { method: "PATCH", cookie, json }), ctx({ id }));
    const lent = await body(await patch({ status: "emprestado", borrower: "Rafael" }));
    expect(lent.book).toMatchObject({ status: "emprestado", borrower: "Rafael" });
    const back = await body(await patch({ status: "lido", yearRead: 2026 }));
    expect(back.book).toMatchObject({ status: "lido", borrower: null, yearRead: 2026 });
  });

  it("isola livros de outros usuários (404)", async () => {
    const res = await bookById.PATCH(
      req(`/api/books/${created.id}`, { method: "PATCH", cookie: bia.cookie, json: { title: "hack" } }),
      ctx({ id: created.id }),
    );
    expect(res.status).toBe(404);
    const del = await bookById.DELETE(req(`/api/books/${created.id}`, { method: "DELETE", cookie: bia.cookie }), ctx({ id: created.id }));
    expect(del.status).toBe(404);
    expect((await bookById.DELETE(req("/api/books/abc", { method: "DELETE", cookie: ana.cookie }), ctx({ id: "abc" }))).status).toBe(404);
  });

  it("atualiza em lote ignorando ids de outros usuários", async () => {
    const biaBook = (await body(await booksRoute.POST(req("/api/books", { method: "POST", cookie: bia.cookie, json: { title: "Da Bia" } }), ctx()))).book;
    const res = await body(
      await booksRoute.PATCH(
        req("/api/books", {
          method: "PATCH",
          cookie: ana.cookie,
          json: [
            { id: created.id, coverUrl: "https://capa/1.jpg", coverCheckedAt: "2026-06-15T12:00:00.000Z" },
            { id: biaBook.id, coverUrl: "https://hack" },
          ],
        }),
        ctx(),
      ),
    );
    expect(res.books).toHaveLength(1);
    expect(res.books[0].coverUrl).toBe("https://capa/1.jpg");
    const biaList = await body(await booksRoute.GET(req("/api/books", { cookie: bia.cookie }), ctx()));
    expect(biaList.books[0].coverUrl).toBeNull();
  });

  it("exclui", async () => {
    const res = await bookById.DELETE(req(`/api/books/${created.id}`, { method: "DELETE", cookie: ana.cookie }), ctx({ id: created.id }));
    expect(res.status).toBe(204);
  });
});

describe("importar backup", () => {
  it("substitui o acervo pelo backup do standalone", async () => {
    const res = await body(await importRoute.POST(req("/api/books/import", { method: "POST", cookie: ana.cookie, json: backup }), ctx()));
    expect(res.count).toBe(30);
    expect(res.books).toHaveLength(30);
    expect(res.books[0]).toMatchObject({ title: "1984", pages: 416, orderNo: 1 });
  });
  it("rejeita o que não é array", async () => {
    const res = await importRoute.POST(req("/api/books/import", { method: "POST", cookie: ana.cookie, json: { x: 1 } }), ctx());
    expect(res.status).toBe(400);
  });
});

describe("metas", () => {
  it("usa 24 por padrão e persiste por ano", async () => {
    const get = (y: string) => goalsRoute.GET(req(`/api/goals/${y}`, { cookie: ana.cookie }), ctx({ year: y }));
    expect(await body(await get("2026"))).toEqual({ year: 2026, target: 24 });
    await goalsRoute.PUT(req("/api/goals/2026", { method: "PUT", cookie: ana.cookie, json: { target: 25 } }), ctx({ year: "2026" }));
    expect((await body(await get("2026"))).target).toBe(25);
    expect((await body(await get("2027"))).target).toBe(24);
    expect((await get("abc")).status).toBe(404);
    const bad = await goalsRoute.PUT(req("/api/goals/2026", { method: "PUT", cookie: ana.cookie, json: { target: 0 } }), ctx({ year: "2026" }));
    expect(bad.status).toBe(400);
  });
});

describe("planilha", () => {
  it("rejeita link que não é do Google Sheets", async () => {
    const res = await syncRoute.POST(req("/api/sheet-sync", { method: "POST", cookie: bia.cookie, json: { sheetUrl: "https://evil.com/x" } }), ctx());
    expect(res.status).toBe(400);
  });

  it("sincroniza e salva a URL", async () => {
    const csv = "Título;Autor;Status\nDa Bia;;Lido\nNovo da planilha;Fulana;Não lido";
    const fetchMock = vi.fn(async () => new Response(csv, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0";
    const res = await body(await syncRoute.POST(req("/api/sheet-sync", { method: "POST", cookie: bia.cookie, json: { sheetUrl: url } }), ctx()));
    expect(res).toMatchObject({ updated: 1, added: 1, message: "Sincronizado: 1 livros atualizados e 1 novos." });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&gid=0");
    expect(await body(await settingsRoute.GET(req("/api/settings", { cookie: bia.cookie }), ctx()))).toEqual({ sheetUrl: url });
  });

  it("planilha privada (HTML) devolve a orientação sem alterar nada", async () => {
    vi.stubGlobal("fetch", async () => new Response("<!DOCTYPE html><html>login</html>", { status: 200 }));
    const res = await syncRoute.POST(req("/api/sheet-sync", { method: "POST", cookie: bia.cookie, json: {} }), ctx());
    expect(res.status).toBe(422);
    expect((await body(res)).error).toContain("Qualquer pessoa com o link");
  });
});
