/**
 * Marca de três lombadas para imagens geradas com `next/og` (ícone e preview de
 * compartilhamento): só flexbox e estilos inline, que é o que o Satori entende.
 * Cores fixas do tema claro (`--ink` e `--acc` em hex).
 */
export const BRAND_INK = "#1b1a17";
export const BRAND_ACC = "#af3e30";
export const BRAND_BG = "#f4f2ee";
export const BRAND_MUTE = "#6f695f";

/** `unit` = largura de uma lombada (8px no header do app). */
export function BrandImage({ unit }: { unit: number }) {
  const r = unit / 4;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: unit / 4 }}>
      <div
        style={{
          width: unit,
          height: unit * 3,
          borderRadius: r,
          background: BRAND_INK,
        }}
      />
      <div
        style={{
          width: unit,
          height: unit * 2.5,
          borderRadius: r,
          border: `${unit * 0.1875}px solid ${BRAND_INK}`,
        }}
      />
      <div
        style={{
          width: unit,
          height: unit * 3.5,
          borderRadius: r,
          background: BRAND_ACC,
        }}
      />
    </div>
  );
}
