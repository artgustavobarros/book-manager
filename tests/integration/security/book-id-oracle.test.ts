/**
 * Regressão do achado 5 da auditoria (run-1).
 *
 * `POST /api/books` aceita um `id` escolhido por quem chama, como chave de
 * idempotência. Quando esse id já existia em **outra** conta, o insert batia no
 * conflito, a releitura por `(id, userId)` não achava nada e a rota respondia
 * 409 — enquanto um id livre respondia 201. A diferença contava se o id existe
 * na base inteira, e ids de livro não são segredo: a estante pública os
 * projeta (`lib/services/public-shelf.ts`) e os links de compartilhamento os
 * carregam em `?livro=<uuid>`.
 *
 * Com a correção, o conflito é do dono e não da tabela.
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import * as booksRoute from "@/app/api/books/route";
import type { DB } from "@/lib/db";
import { books } from "@/lib/db/schema";

import { setupTestDb } from "../../support/db";
import { createUserSession, ctx, req } from "../../support/session";

let db: DB;
beforeAll(async () => {
  db = await setupTestDb();
});

function post(cookie: string, json: unknown) {
  return booksRoute.POST(
    req("/api/books", { method: "POST", cookie, json }),
    ctx()
  );
}

function ownerOf(id: string, userId: string) {
  return db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)));
}

describe("achado 5 — id de outra conta não pode ser distinguido de id livre", () => {
  it("responde igual para id de outra pessoa e para id livre", async () => {
    const dona = await createUserSession("Dona A");
    const sonda = await createUserSession("Pessoa B");

    const idDaDona = randomUUID();
    expect(
      (await post(dona.cookie, { id: idDaDona, title: "Livro da dona" })).status
    ).toBe(201);

    const livre = await post(sonda.cookie, {
      id: randomUUID(),
      title: "Sonda com id livre",
    });
    const ocupado = await post(sonda.cookie, {
      id: idDaDona,
      title: "Sonda com id de outra conta",
    });

    // Mesmo status e mesmo formato: nada distingue os dois casos.
    expect(livre.status).toBe(201);
    expect(ocupado.status).toBe(livre.status);

    const corpoLivre = (await livre.json()) as { book: { id: string } };
    const corpoOcupado = (await ocupado.json()) as { book: { id: string } };
    expect(Object.keys(corpoOcupado)).toEqual(Object.keys(corpoLivre));
    expect(Object.keys(corpoOcupado.book).sort()).toEqual(
      Object.keys(corpoLivre.book).sort()
    );

    // O livro gravado é de quem pediu, com id do servidor.
    expect(corpoOcupado.book.id).not.toBe(idDaDona);
    expect(await ownerOf(corpoOcupado.book.id, sonda.userId)).toHaveLength(1);

    // E o livro da dona segue intacto.
    const [original] = await ownerOf(idDaDona, dona.userId);
    expect(original.title).toBe("Livro da dona");
  });

  it("repetir o próprio id continua idempotente", async () => {
    const dona = await createUserSession("Dona C");
    const id = randomUUID();

    const primeira = await post(dona.cookie, { id, title: "Livro repetido" });
    const repetida = await post(dona.cookie, { id, title: "Livro repetido" });

    expect(primeira.status).toBe(201);
    expect(repetida.status).toBe(201);
    const a = (await primeira.json()) as { book: { id: string } };
    const b = (await repetida.json()) as { book: { id: string } };
    expect(b.book.id).toBe(a.book.id);
    expect(a.book.id).toBe(id);

    // A repetição não pode ter criado um segundo livro.
    expect(
      await db.select().from(books).where(eq(books.userId, dona.userId))
    ).toHaveLength(1);
  });
});
