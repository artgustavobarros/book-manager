import { ImageResponse } from "next/og";

import {
  BRAND_BG,
  BRAND_INK,
  BRAND_MUTE,
  BrandImage,
} from "@/components/brand/brand-image";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME + " · " + SITE_DESCRIPTION;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview de compartilhamento (gerado no build). Fonte padrão do next/og: ele não lê woff2. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 40,
        padding: "0 96px",
        background: BRAND_BG,
        color: BRAND_INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <BrandImage unit={36} />
        <span
          style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-0.025em" }}
        >
          {SITE_NAME}
        </span>
      </div>
      <span
        style={{
          fontSize: 40,
          lineHeight: 1.35,
          color: BRAND_MUTE,
          maxWidth: 900,
        }}
      >
        {SITE_DESCRIPTION}
      </span>
    </div>,
    size
  );
}
