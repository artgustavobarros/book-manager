import { json, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { createBook, listBooks, updateBooks } from "@/lib/services/books";
import { bookBatchSchema, bookCreateSchema } from "@/lib/validation/book";

/** Acervo completo do usuário. */
export const GET = withSession(async ({ userId }) =>
  json({ books: await listBooks(db, userId) })
);

/** Registrar livro (atribui o próximo nº de ordem se vier vazio). */
export const POST = withSession(async ({ request, userId }) => {
  const input = await parseBody(request, bookCreateSchema);
  return json({ book: await createBook(db, userId, input) }, { status: 201 });
});

/** Atualização em lote (capas automáticas, ano lido): até 100 livros. */
export const PATCH = withSession(async ({ request, userId }) => {
  const items = await parseBody(request, bookBatchSchema);
  return json({ books: await updateBooks(db, userId, items) });
});
