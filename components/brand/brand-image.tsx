/**
 * Marca da Bodega para imagens geradas com `next/og` (preview de compartilhamento):
 * só flexbox, posição absoluta e estilos inline, que é o que o Satori entende.
 * Cores fixas do tema claro (`--ink`, `--acc`, `--card`, `--bg` e `--mute` em hex).
 */
export const BRAND_INK = "#1f1b18";
export const BRAND_ACC = "#7a2232";
export const BRAND_CARD = "#fbf8f2";
export const BRAND_BG = "#f4eee3";
export const BRAND_MUTE = "#5e554c";

/** Mesmas proporções do `BrandMark` grande (36px de altura), multiplicadas por `scale`. */
export function BrandImage({ scale }: { scale: number }) {
  const s = (n: number) => n * scale;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        gap: s(3),
        height: s(36),
        padding: `0 ${s(1)}px ${s(3)}px ${s(1)}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: s(1),
        }}
      >
        <div
          style={{
            width: s(15),
            height: s(5),
            borderRadius: s(1),
            background: BRAND_INK,
          }}
        />
        <div
          style={{
            width: s(18),
            height: s(6),
            borderRadius: s(1),
            background: BRAND_INK,
          }}
        />
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          width: s(9),
          height: s(26),
          borderRadius: `${s(4)}px ${s(4)}px ${s(1)}px ${s(1)}px`,
          background: BRAND_ACC,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: s(3),
            top: s(-6),
            width: s(3),
            height: s(7),
            borderRadius: `${s(1)}px ${s(1)}px 0 0`,
            background: BRAND_ACC,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: s(2),
            right: s(2),
            top: s(10),
            height: s(5),
            borderRadius: s(1),
            background: BRAND_CARD,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: s(2),
          borderRadius: s(1),
          background: BRAND_INK,
        }}
      />
    </div>
  );
}
