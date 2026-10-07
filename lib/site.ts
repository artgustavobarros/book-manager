import type { Theme } from "@/lib/theme";

/** Identidade usada nos metadados, no manifest e nas imagens geradas. */
export const SITE_NAME = "Bodega Literária";
export const SITE_DESCRIPTION =
  "Catálogo pessoal dos livros de casa: estante, metas de leitura e dados do acervo.";

/** Fundo da página em cada tema (`--bg` em app/styles/tokens/colors.css). */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#f4eee3",
  dark: "#171312",
};
