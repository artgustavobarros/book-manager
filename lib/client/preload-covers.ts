import { preload } from "react-dom";

import { coverSrc } from "@/lib/domain/cover";

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
