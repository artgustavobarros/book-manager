import type { ShelfView } from "@/lib/domain/shelf";

export const THEME_COOKIE = "bodega-tema";
export const TZ_COOKIE = "bodega-tz";
export const SHELF_VIEW_COOKIE = "bodega-vista";
export type Theme = "light" | "dark";

export function parseTheme(v: string | undefined | null): Theme {
  return v === "dark" ? "dark" : "light";
}

export function parseShelfView(v: string | undefined | null): ShelfView {
  return v === "list" || v === "lista" ? "list" : "grid";
}
