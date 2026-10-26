/** Capa gerada (quando não há imagem): par de cores escolhido pelo hash de título + autor. */

export const COVERS: readonly (readonly [bg: string, ink: string])[] = [
  ["#2f4a3a", "#efe8da"],
  ["#8a3b2e", "#f3e6d8"],
  ["#1f3354", "#e9e4d6"],
  ["#c9a24a", "#1d1b18"],
  ["#5b3a5e", "#efe3e8"],
  ["#d9cbb3", "#2a2622"],
  ["#3d3a36", "#e8e1d4"],
  ["#a65a3a", "#f6ece0"],
  ["#7d8b6a", "#1d1b18"],
];

export function hash(s: string | null | undefined): number {
  let h = 0;
  for (const c of s || "") {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  return h;
}

/**
 * Mesmo cálculo do standalone: `hash(b.title + b.author)`. No standalone, autor vazio
 * era "" e nunca undefined, então null é tratado como "".
 */
export function coverColors(
  title: string | null | undefined,
  author: string | null | undefined
) {
  const c = COVERS[hash((title || "") + (author || "")) % COVERS.length];
  return { coverBg: c[0], coverInk: c[1] };
}

/**
 * URL da capa para exibir. As capas da Apple (iTunes) saem em WebP: o CDN serve o
 * mesmo tamanho com cerca de 1/3 dos bytes do JPG gravado no acervo.
 */
export function coverSrc(url: string): string {
  return /^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(url)
    ? url.replace(/(\/\d+x\d+bb)\.jpg$/, "$1.webp")
    : url;
}

/**
 * Valor de `background-image` para a capa (ou "none"). A URL vem do usuário: aspas,
 * barra invertida e quebras de linha viram escapes CSS para não sair do `url("…")`.
 */
export function coverImage(url: string | null | undefined): string {
  if (!url) {
    return "none";
  }
  const safe = coverSrc(url).replace(
    /["\\\n\r\f]/g,
    (c) => "\\" + c.charCodeAt(0).toString(16) + " "
  );
  return `url("${safe}")`;
}
