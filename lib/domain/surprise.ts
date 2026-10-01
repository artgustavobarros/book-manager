/** Sorteio do "Me surpreenda" (porta de `draw()` e das opções de gênero do standalone). */
import { norm } from "./text";
import type { Book } from "./types";

export interface GenreOption {
  value: string;
  label: string;
}

export function surpriseGenres(books: readonly Book[]): { unread: number; options: GenreOption[] } {
  const unread = books.filter((b) => b.status === "nao-lido");
  const gm = new Map<string, { label: string; n: number }>();
  for (const b of unread) {
    const k = norm(b.genre);
    if (!k) continue;
    const e = gm.get(k) ?? { label: b.genre!, n: 0 };
    e.n++;
    gm.set(k, e);
  }
  return {
    unread: unread.length,
    options: [
      { value: "todos", label: "Todos os gêneros (" + unread.length + ")" },
      ...[...gm.entries()].sort((a, b) => b[1].n - a[1].n).map(([value, v]) => ({ value, label: v.label + " (" + v.n + ")" })),
    ],
  };
}

export function surprisePool(books: readonly Book[], genre: string): Book[] {
  return books.filter((b) => b.status === "nao-lido" && (genre === "todos" || norm(b.genre) === genre));
}

/** Sorteia evitando repetir o último quando há mais de uma opção. */
export function drawBook(pool: readonly Book[], lastId: string | null, random: () => number = Math.random): Book | null {
  const cands = pool.length > 1 ? pool.filter((b) => b.id !== lastId) : pool;
  return cands.length ? cands[Math.floor(random() * cands.length)] : null;
}
