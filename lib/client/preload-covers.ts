import { preload } from "react-dom";

import { coverSrc } from "@/lib/domain/cover";

const LOADED_COVERS = new Set<string>();

export function isCoverLoaded(src: string): boolean {
  return LOADED_COVERS.has(src);
}

export function markCoverLoaded(src: string): void {
  LOADED_COVERS.add(src);
}

/**
 * Pede no <head>, com prioridade alta, as capas das 2 primeiras posições da grade:
 * são o LCP, e pelo background-image o download só começaria depois do CSS.
 */
export function preloadCovers(books: readonly { coverUrl: string | null }[]) {
  for (const b of books.slice(0, 2)) {
    if (b.coverUrl) {
      preload(coverSrc(b.coverUrl), { as: "image", fetchPriority: "high" });
    }
  }
}
