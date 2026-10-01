export const THEME_COOKIE = "bodega-tema";
export const TZ_COOKIE = "bodega-tz";
export type Theme = "light" | "dark";

export function parseTheme(v: string | undefined | null): Theme {
  return v === "dark" ? "dark" : "light";
}
