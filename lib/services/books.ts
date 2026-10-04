/** Acesso a livros, sempre filtrado pelo dono (`userId` vem da sessão, nunca do cliente). */
import { and, asc, eq, inArray, max } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { type BookRow, books } from "@/lib/db/schema";
import {
  type Book,
  type BookFields,
  EMPTY_BOOK_FIELDS,
} from "@/lib/domain/types";

export function rowToBook(r: BookRow): Book {
  return {
    id: r.id,
    orderNo: r.orderNo,
    title: r.title,
    author: r.author,
    authorGender: r.authorGender,
    authorEthnicity: r.authorEthnicity,
    nationality: r.nationality,
    publisher: r.publisher,
    genre: r.genre,
    yearPublished: r.yearPublished,
    pages: r.pages,
    acquiredOn: r.acquiredOn,
    status: r.status,
    borrower: r.borrower,
    yearRead: r.yearRead,
    notes: r.notes,
    coverUrl: r.coverUrl,
    favorite: r.favorite,
    coverCheckedAt: r.coverCheckedAt ? r.coverCheckedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

type Values = Partial<
  Omit<BookRow, "id" | "userId" | "createdAt" | "updatedAt">
>;

/** Campos do modelo → valores da tabela (datas como Date; regra do empréstimo). */
function toValues(fields: Partial<BookFields>): Values {
  const { coverCheckedAt, ...rest } = fields;
  const values: Values = { ...rest };
  if (coverCheckedAt !== undefined) {
    values.coverCheckedAt = coverCheckedAt ? new Date(coverCheckedAt) : null;
  }
  // Fora do status "emprestado" não há com quem o livro esteja.
  if (fields.status !== undefined && fields.status !== "emprestado") {
    values.borrower = null;
  }
  return values;
}

export async function listBooks(db: DB, userId: string): Promise<Book[]> {
  const rows = await db
    .select()
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(asc(books.orderNo), asc(books.createdAt));
  return rows.map(rowToBook);
}

async function nextOrderNo(db: DB, userId: string): Promise<number> {
  const [r] = await db
    .select({ m: max(books.orderNo) })
    .from(books)
    .where(eq(books.userId, userId));
  return (r?.m ?? 0) + 1;
}

export async function createBook(
  db: DB,
  userId: string,
  fields: Partial<BookFields> & { title: string }
): Promise<Book> {
  const orderNo = fields.orderNo ?? (await nextOrderNo(db, userId));
  const [row] = await db
    .insert(books)
    .values({
      ...toValues({ ...EMPTY_BOOK_FIELDS, ...fields }),
      title: fields.title,
      orderNo,
      userId,
    })
    .returning();
  return rowToBook(row);
}

export async function updateBook(
  db: DB,
  userId: string,
  id: string,
  fields: Partial<BookFields>
): Promise<Book | null> {
  const [row] = await db
    .update(books)
    .set(toValues(fields))
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning();
  return row ? rowToBook(row) : null;
}

export async function deleteBook(
  db: DB,
  userId: string,
  id: string
): Promise<boolean> {
  const rows = await db
    .delete(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning({ id: books.id });
  return rows.length > 0;
}

/** Atualiza vários livros do usuário numa transação; ids de outros usuários são ignorados. */
export async function updateBooks(
  db: DB,
  userId: string,
  items: readonly ({ id: string } & Partial<BookFields>)[]
): Promise<Book[]> {
  return db.transaction(async (tx) => {
    const out: Book[] = [];
    for (const { id, ...fields } of items) {
      const [row] = await tx
        .update(books)
        .set(toValues(fields))
        .where(and(eq(books.id, id), eq(books.userId, userId)))
        .returning();
      if (row) {
        out.push(rowToBook(row));
      }
    }
    return out;
  });
}

const CHUNK = 500;

/** Substitui todo o acervo do usuário (restaurar backup), de forma atômica. */
export async function replaceBooks(
  db: DB,
  userId: string,
  list: readonly BookFields[]
): Promise<number> {
  await db.transaction(async (tx) => {
    await tx.delete(books).where(eq(books.userId, userId));
    for (let i = 0; i < list.length; i += CHUNK) {
      await tx
        .insert(books)
        .values(
          list
            .slice(i, i + CHUNK)
            .map((f) => ({ ...toValues(f), title: f.title, userId }))
        );
    }
  });
  return list.length;
}

/** Aplica o resultado do merge da planilha (atualizações + inserções) numa transação. */
export async function applyMerge(
  db: DB,
  userId: string,
  merge: {
    updates: { id: string; fields: Partial<BookFields> }[];
    inserts: BookFields[];
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    const ids = merge.updates.map((u) => u.id);
    const owned = ids.length
      ? new Set(
          (
            await tx
              .select({ id: books.id })
              .from(books)
              .where(and(eq(books.userId, userId), inArray(books.id, ids)))
          ).map((r) => r.id)
        )
      : new Set<string>();
    for (const u of merge.updates) {
      if (!owned.has(u.id)) {
        continue;
      }
      // A planilha não mexe em "emprestado para" além do que trouxe explicitamente.
      const { status, ...rest } = u.fields;
      await tx
        .update(books)
        .set({ ...toValues(rest), ...(status ? { status } : {}) })
        .where(and(eq(books.id, u.id), eq(books.userId, userId)));
    }
    for (let i = 0; i < merge.inserts.length; i += CHUNK) {
      await tx.insert(books).values(
        merge.inserts.slice(i, i + CHUNK).map((f) => {
          const { coverCheckedAt, ...rest } = f;
          return {
            ...rest,
            coverCheckedAt: coverCheckedAt ? new Date(coverCheckedAt) : null,
            title: f.title,
            userId,
          };
        })
      );
    }
  });
}
