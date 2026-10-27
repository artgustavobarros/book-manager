/** Acesso a livros, sempre filtrado pelo dono (`userId` vem da sessão, nunca do cliente). */
import { and, asc, eq, inArray, isNull, max, type SQL, sql } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { type BookRow, books } from "@/lib/db/schema";
import type { RestoredBook } from "@/lib/domain/backup";
import {
  type Book,
  type BookFields,
  EMPTY_BOOK_FIELDS,
  type Situation,
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
    reading: r.reading,
    situation: r.situation,
    borrower: r.borrower,
    lentAt: r.lentAt ? r.lentAt.toISOString() : null,
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
  Omit<BookRow, "id" | "userId" | "createdAt" | "updatedAt" | "lentAt">
>;

/** Campos do modelo → valores da tabela (datas como Date; regra do empréstimo). */
function toValues(fields: Partial<BookFields>): Values {
  const { coverCheckedAt, ...rest } = fields;
  const values: Values = { ...rest };
  if (coverCheckedAt !== undefined) {
    values.coverCheckedAt = coverCheckedAt ? new Date(coverCheckedAt) : null;
  }
  // Fora de Emprestado não há com quem o livro esteja.
  if (fields.situation !== undefined && fields.situation !== "emprestado") {
    values.borrower = null;
  }
  return values;
}

/**
 * Início do empréstimo num UPDATE: entrar em Emprestado grava o instante atual,
 * continuar emprestado mantém o valor e sair da Situação limpa. No SET, `books.situation`
 * ainda é o valor antigo da linha, então a transição sai sem leitura extra.
 */
function lentAtOnUpdate(situation: Situation | undefined): {
  lentAt?: SQL | null;
} {
  if (situation === undefined) {
    return {};
  }
  if (situation !== "emprestado") {
    return { lentAt: null };
  }
  return {
    lentAt: sql`case when ${books.situation} = 'emprestado' then coalesce(${books.lentAt}, now()) else now() end`,
  };
}

/** Valores de um UPDATE: campos do modelo mais a regra do início do empréstimo. */
function toUpdateValues(fields: Partial<BookFields>) {
  return { ...toValues(fields), ...lentAtOnUpdate(fields.situation) };
}

/** Início do empréstimo num INSERT: o informado (backup), ou agora; null fora de Emprestado. */
function lentAtOnInsert(
  situation: Situation | undefined,
  lentAt?: string
): Date | null {
  if (situation !== "emprestado") {
    return null;
  }
  return lentAt ? new Date(lentAt) : new Date();
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
  fields: Partial<BookFields> & { title: string },
  id?: string
): Promise<Book | null> {
  const orderNo = fields.orderNo ?? (await nextOrderNo(db, userId));
  const [row] = await db
    .insert(books)
    .values({
      ...(id ? { id } : {}),
      ...toValues({ ...EMPTY_BOOK_FIELDS, ...fields }),
      lentAt: lentAtOnInsert(fields.situation ?? EMPTY_BOOK_FIELDS.situation),
      title: fields.title,
      orderNo,
      userId,
    })
    .onConflictDoNothing({ target: books.id })
    .returning();
  if (row) {
    return rowToBook(row);
  }
  if (id) {
    const [existing] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)));
    return existing ? rowToBook(existing) : null;
  }
  return null;
}

export async function updateBook(
  db: DB,
  userId: string,
  id: string,
  fields: Partial<BookFields>
): Promise<Book | null> {
  const [row] = await db
    .update(books)
    .set(toUpdateValues(fields))
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
  items: readonly ({
    id: string;
    onlyIfNoCover?: boolean;
  } & Partial<BookFields>)[]
): Promise<Book[]> {
  return db.transaction(async (tx) => {
    const out: Book[] = [];
    for (const { id, onlyIfNoCover, ...fields } of items) {
      const [row] = await tx
        .update(books)
        .set(toUpdateValues(fields))
        .where(
          and(
            eq(books.id, id),
            eq(books.userId, userId),
            ...(onlyIfNoCover
              ? [isNull(books.coverUrl), isNull(books.coverCheckedAt)]
              : [])
          )
        )
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
  list: readonly RestoredBook[]
): Promise<number> {
  await db.transaction(async (tx) => {
    await tx.delete(books).where(eq(books.userId, userId));
    for (let i = 0; i < list.length; i += CHUNK) {
      await tx.insert(books).values(
        list.slice(i, i + CHUNK).map(({ lentAt, ...f }) => ({
          ...toValues(f),
          lentAt: lentAtOnInsert(f.situation, lentAt),
          title: f.title,
          userId,
        }))
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
      await tx
        .update(books)
        .set(toUpdateValues(u.fields))
        .where(and(eq(books.id, u.id), eq(books.userId, userId)));
    }
    for (let i = 0; i < merge.inserts.length; i += CHUNK) {
      await tx.insert(books).values(
        merge.inserts.slice(i, i + CHUNK).map((f) => {
          const { coverCheckedAt, ...rest } = f;
          return {
            ...rest,
            coverCheckedAt: coverCheckedAt ? new Date(coverCheckedAt) : null,
            lentAt: lentAtOnInsert(f.situation),
            title: f.title,
            userId,
          };
        })
      );
    }
  });
}
