/**
 * Card social da estante (1200×630), do `OG Card` do handoff. Só flexbox, posição
 * absoluta e estilos inline, para servir ao Satori (`next/og`) e à prévia do modal,
 * que o desenha no DOM em escala. Cores fixas do tema claro, como a OG do site.
 */
import type { OgCover, OgData } from "@/lib/domain/share";

import {
  BRAND_ACC,
  BRAND_BG,
  BRAND_INK,
  BRAND_MUTE,
  BrandImage,
} from "../brand/brand-image";

const OURO = "#b08a3e";
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Alturas das lombadas na prateleira (variam como livros de verdade). */
const SPINE_H = [300, 348, 276, 372, 324];

function Cover({
  c,
  width,
  height,
  fontSize,
}: {
  c: OgCover;
  width: number;
  height: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width,
        height,
        flexShrink: 0,
        padding: `${Math.round(width * 0.15)}px ${Math.round(width * 0.12)}px`,
        borderRadius: 6,
        overflow: "hidden",
        background: c.bg,
        color: c.ink,
        boxShadow: "0 12px 24px -14px rgba(27,26,23,.5)",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.08,
          overflow: "hidden",
          wordBreak: "break-word",
          maxHeight: height - 24,
        }}
      >
        {c.title}
      </span>
      {c.coverUrl ? (
        // biome-ignore lint/performance/noImgElement: Satori só desenha <img>; a prévia usa o mesmo desenho.
        <img
          alt=""
          height={height}
          src={c.coverUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            objectFit: "cover",
          }}
          width={width}
        />
      ) : null}
    </div>
  );
}

export function ShelfOgCard({ og }: { og: OgData }) {
  const isBook = og.variant === "book";
  const headSize = isBook
    ? og.headline.length > 28
      ? 55
      : 67
    : og.headline.length > 22
      ? 62
      : 77;
  const shelfW = isBook ? 312 : og.covers.length * 104 + 40;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        overflow: "hidden",
        background: BRAND_BG,
        color: BRAND_INK,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: isBook ? 680 : 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 0 74px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BrandImage scale={1.2} />
          <div style={{ display: "flex", gap: 8, fontSize: 28, lineHeight: 1 }}>
            <span style={{ fontWeight: 700 }}>Bodega</span>
            <span style={{ fontStyle: "italic", color: BRAND_ACC }}>
              Literária
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 26, fontWeight: 500, color: BRAND_MUTE }}>
            {og.eyebrow}
          </span>
          <span
            style={{
              fontSize: headSize,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              maxHeight: headSize * 1.02 * 3,
              overflow: "hidden",
            }}
          >
            {og.headline}
          </span>
          {og.accent ? (
            <span
              style={{
                fontSize: 41,
                fontStyle: "italic",
                fontWeight: 500,
                lineHeight: 1.1,
                color: BRAND_ACC,
                maxHeight: 41 * 1.1 * 2,
                overflow: "hidden",
              }}
            >
              {og.accent}
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 23,
            fontWeight: 600,
            color: BRAND_MUTE,
          }}
        >
          <div
            style={{ width: 10, height: 10, borderRadius: 5, background: OURO }}
          />
          <span>{og.foot}</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 84,
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {og.covers.map((c, i) =>
          isBook ? (
            <Cover c={c} fontSize={29} height={396} key={c.title} width={264} />
          ) : (
            <Cover
              c={c}
              fontSize={14}
              height={SPINE_H[i % SPINE_H.length]}
              key={c.title + i}
              width={96}
            />
          )
        )}
      </div>
      <div
        style={{
          position: "absolute",
          right: 48,
          bottom: 78,
          width: shelfW,
          height: 6,
          borderRadius: 3,
          background: BRAND_INK,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 14,
          background: BRAND_ACC,
        }}
      />
    </div>
  );
}
