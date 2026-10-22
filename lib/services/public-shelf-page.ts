/** Carga da estante pública por slug, memoizada por requisição (página, metadados e OG). */
import { cache } from "react";

import { db } from "@/lib/db";
import { ogVersion } from "@/lib/domain/share";
import type { PublicBook, PublicOwner } from "@/lib/domain/types";
import { isPublicSlug } from "@/lib/validation/public-shelf";

import {
  findPublicShelf,
  listPublicBooks,
  publicShelfStamp,
} from "./public-shelf";

export interface LoadedPublicShelf {
  books: PublicBook[];
  owner: PublicOwner;
  /** Só para comparar com a sessão no servidor; nunca vai para o cliente. */
  ownerId: string;
  slug: string;
  version: string;
}

export const loadPublicShelf = cache(
  async (slug: string): Promise<LoadedPublicShelf | null> => {
    if (!isPublicSlug(slug)) {
      return null;
    }
    const shelf = await findPublicShelf(db, slug);
    if (!shelf) {
      return null;
    }
    const [books, stamp] = await Promise.all([
      listPublicBooks(db, shelf.ownerId),
      publicShelfStamp(db, shelf.ownerId),
    ]);
    return {
      ...shelf,
      books,
      version: ogVersion(stamp.count, stamp.lastUpdate, shelf.owner.name),
    };
  }
);
