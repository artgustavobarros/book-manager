/**
 * Estante pública: publicação pelo dono e leitura por visitantes. A projeção dos
 * livros é feita aqui, na consulta, para que campos privados nunca saiam do banco.
 */
import { and, asc, count, eq, like, max, ne, or, sql } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { books, user, userSettings } from "@/lib/db/schema";
import { ownerSlugBase } from "@/lib/domain/share";
import type { PublicBook, PublicOwner } from "@/lib/domain/types";

export interface PublicShelfState {
  enabled: boolean;
  slug: string | null;
}

/** Publicar exige e-mail confirmado. */
export class UnverifiedEmailError extends Error {
  constructor() {
    super("Confirme seu e-mail para publicar sua estante.");
  }
}

export async function getPublicShelfState(
  db: DB,
  userId: string
): Promise<PublicShelfState> {
  const [row] = await db
    .select({
      slug: userSettings.publicSlug,
      enabled: userSettings.publicEnabled,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return { enabled: row?.enabled ?? false, slug: row?.slug ?? null };
}

/** Menor slug livre: a base ou a base com sufixo a partir de 2. */
async function freeSlug(db: DB, base: string): Promise<string> {
  const taken = new Set(
    (
      await db
        .select({ slug: userSettings.publicSlug })
        .from(userSettings)
        .where(
          or(
            eq(userSettings.publicSlug, base),
            like(userSettings.publicSlug, base + "-%")
          )
        )
    ).map((r) => r.slug)
  );
  if (!taken.has(base)) {
    return base;
  }
  let n = 2;
  while (taken.has(base + "-" + n)) {
    n += 1;
  }
  return base + "-" + n;
}

const isUniqueViolation = (e: unknown) =>
  (e as { code?: string; cause?: { code?: string } })?.code === "23505" ||
  (e as { cause?: { code?: string } })?.cause?.code === "23505";

/**
 * Liga ou desliga a estante pública. Na primeira publicação reserva o slug (a partir do
 * nome); depois ele não muda mais, nem ao trocar o nome, nem ao despublicar.
 */
export async function setPublished(
  db: DB,
  userId: string,
  enabled: boolean
): Promise<PublicShelfState> {
  const [owner] = await db
    .select({ name: user.name, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  if (enabled && !owner?.emailVerified) {
    throw new UnverifiedEmailError();
  }
  const current = await getPublicShelfState(db, userId);
  if (!enabled || current.slug) {
    await db
      .insert(userSettings)
      .values({ userId, publicEnabled: enabled })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { publicEnabled: enabled },
      });
    return { enabled, slug: current.slug };
  }
  // Corrida com outra publicação do mesmo nome: o índice único recusa; tenta o próximo.
  const base = ownerSlugBase(owner?.name);
  for (let attempt = 0; ; attempt++) {
    const slug = await freeSlug(db, base);
    try {
      const [saved] = await db
        .insert(userSettings)
        .values({ userId, publicEnabled: true, publicSlug: slug })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            publicEnabled: true,
            publicSlug: sql`coalesce(${userSettings.publicSlug}, excluded.public_slug)`,
          },
        })
        .returning({ slug: userSettings.publicSlug });
      return { enabled: true, slug: saved.slug };
    } catch (e) {
      if (!isUniqueViolation(e) || attempt >= 4) {
        throw e;
      }
    }
  }
}

export interface PublicShelf {
  owner: PublicOwner;
  /** Fica no servidor: nunca vai para o cliente. */
  ownerId: string;
  slug: string;
}

/** Estante publicada pelo slug; `null` para slug inexistente ou estante privada. */
export async function findPublicShelf(
  db: DB,
  slug: string
): Promise<PublicShelf | null> {
  const [row] = await db
    .select({ ownerId: user.id, name: user.name, image: user.image })
    .from(userSettings)
    .innerJoin(user, eq(user.id, userSettings.userId))
    .where(
      and(
        eq(userSettings.publicSlug, slug),
        eq(userSettings.publicEnabled, true)
      )
    );
  if (!row) {
    return null;
  }
  return {
    ownerId: row.ownerId,
    slug,
    owner: { name: row.name, image: row.image },
  };
}

const notDonated = (ownerId: string) =>
  and(eq(books.userId, ownerId), ne(books.status, "doado"));

/** Livros visíveis a visitantes: só os campos públicos e sem os doados. */
export async function listPublicBooks(
  db: DB,
  ownerId: string
): Promise<PublicBook[]> {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      genre: books.genre,
      pages: books.pages,
      publisher: books.publisher,
      yearPublished: books.yearPublished,
      status: books.status,
      coverUrl: books.coverUrl,
    })
    .from(books)
    .where(notDonated(ownerId))
    .orderBy(asc(books.title));
  return rows as PublicBook[];
}

/** Quantidade e última alteração dos livros públicos (versão da imagem OG). */
export async function publicShelfStamp(
  db: DB,
  ownerId: string
): Promise<{ count: number; lastUpdate: string | null }> {
  const [row] = await db
    .select({ n: count(), last: max(books.updatedAt) })
    .from(books)
    .where(notDonated(ownerId));
  return {
    count: Number(row?.n ?? 0),
    lastUpdate: row?.last ? new Date(row.last).toISOString() : null,
  };
}
