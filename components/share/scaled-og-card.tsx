"use client";

import { useEffect, useRef, useState } from "react";

import type { OgData } from "@/lib/domain/share";

import { OG_SIZE, ShelfOgCard } from "./shelf-og-card";

/** O card OG (1200×630) desenhado em escala na largura disponível (prévia do modal). */
export function ScaledOgCard({ og }: { og: OgData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / OG_SIZE.width)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      aria-label={"Prévia da imagem: " + og.title}
      className="relative aspect-[1200/630] w-full overflow-hidden"
      data-og-preview=""
      ref={ref}
      role="img"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `scale(${scale})`,
          visibility: scale ? undefined : "hidden",
        }}
      >
        <ShelfOgCard og={og} />
      </div>
    </div>
  );
}
