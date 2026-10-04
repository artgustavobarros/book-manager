import { z } from "zod";
import { json, notFound, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { deleteBook, updateBook } from "@/lib/services/books";
import { bookPatchSchema } from "@/lib/validation/book";

const idOf = (id: string) => {
  if (!z.uuid().safeParse(id).success) {
    throw notFound();
  }
  return id;
};

export const PATCH = withSession<{ id: string }>(
  async ({ request, userId, params }) => {
    const id = idOf(params.id);
    const fields = await parseBody(request, bookPatchSchema);
    const book = await updateBook(db, userId, id, fields);
    if (!book) {
      throw notFound();
    }
    return json({ book });
  }
);

export const DELETE = withSession<{ id: string }>(
  async ({ userId, params }) => {
    if (!(await deleteBook(db, userId, idOf(params.id)))) {
      throw notFound();
    }
    return new Response(null, { status: 204 });
  }
);
