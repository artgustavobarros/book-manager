"use client";

import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";

/** Abaixo de 640px os blocos viram carrossel (breakpoint do design). */
export const NARROW_QUERY = "(max-width: 640px)";

const isNarrow = () =>
  typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches;
const ease = (t: number) => 1 - (1 - t) ** 4;

/**
 * Comportamento dos carrosséis do standalone (`carGo`, `carScroll`, `carDown`):
 * snap por item, arraste com mouse (só no modo estreito), animação de 520 ms e dots.
 * O layout (grid largo × trilho estreito) fica em CSS via `max-[640px]:`.
 */
export function useCarousel(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<"drag" | "anim" | null>(null);
  const raf = useRef(0);
  const moved = useRef(false);

  const items = useCallback(
    () =>
      ref.current
        ? ([...ref.current.children].filter(
            (c) => (c as HTMLElement).offsetWidth > 0
          ) as HTMLElement[])
        : [],
    []
  );

  const go = useCallback(
    (target: number) => {
      const el = ref.current;
      const its = items();
      if (!(el && its.length)) {
        return;
      }
      const idx = Math.max(0, Math.min(its.length - 1, target));
      const from = el.scrollLeft;
      const to = Math.min(
        its[idx].offsetLeft - its[0].offsetLeft,
        el.scrollWidth - el.clientWidth
      );
      const t0 = performance.now();
      cancelAnimationFrame(raf.current);
      setIndex(idx);
      setBusy("anim");
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 520);
        el.scrollLeft = from + (to - from) * ease(t);
        if (t < 1) {
          raf.current = requestAnimationFrame(step);
        } else {
          setBusy(null);
        }
      };
      raf.current = requestAnimationFrame(step);
    },
    [items]
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onScroll = () => {
    if (busy) {
      return;
    }
    const el = ref.current;
    const its = items();
    if (!(el && its.length)) {
      return;
    }
    const base = its[0].offsetLeft;
    let best = 0;
    let bd = Number.POSITIVE_INFINITY;
    its.forEach((c, k) => {
      const d = Math.abs(c.offsetLeft - base - el.scrollLeft);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
      best = its.length - 1;
    }
    if (best !== index) {
      setIndex(best);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isNarrow() || e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    const el = ref.current;
    if (!el) {
      return;
    }
    cancelAnimationFrame(raf.current);
    const sx = e.clientX;
    const sl = el.scrollLeft;
    const start = index;
    let dx = 0;
    moved.current = false;
    setBusy("drag");
    const move = (ev: PointerEvent) => {
      dx = ev.clientX - sx;
      if (Math.abs(dx) > 4) {
        moved.current = true;
      }
      el.scrollLeft = sl - dx;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const w = items()[0]?.offsetWidth || 1;
      const jump =
        Math.abs(dx) < 40
          ? 0
          : Math.max(1, Math.round(Math.abs(dx) / w)) * (dx < 0 ? 1 : -1);
      setBusy(null);
      go(start + jump);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.stopPropagation();
      e.preventDefault();
      moved.current = false;
    }
  };

  return {
    ref,
    index,
    busy,
    go,
    count,
    trackProps: {
      ref,
      onScroll,
      onPointerDown,
      onClickCapture,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          go(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      },
      "data-busy": busy ? "true" : undefined,
      "data-dragging": busy === "drag" ? "true" : undefined,
    },
  };
}

/** Classes do trilho no modo estreito (somadas às classes do layout largo). */
export const trackNarrow =
  "max-[640px]:mx-[-16px] max-[640px]:cursor-grab max-[640px]:snap-x max-[640px]:snap-mandatory max-[640px]:overflow-x-auto max-[640px]:px-4 max-[640px]:scroll-px-4 max-[640px]:data-[busy=true]:snap-none max-[640px]:data-[dragging=true]:cursor-grabbing max-[640px]:data-[dragging=true]:select-none scrollbar-none";

/** Indicadores (só aparecem abaixo de 640px): ativo estica para 20px. */
export function CarouselDots({
  count,
  index,
  onGo,
  className,
}: {
  count: number;
  index: number;
  onGo: (i: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mt-1 hidden justify-center gap-0 max-[640px]:flex",
        className
      )}
    >
      {Array.from({ length: count }, (_, k) => (
        <button
          aria-current={k === index ? "true" : undefined}
          aria-label={"Ir para o item " + (k + 1)}
          className={cn(
            "flex h-11 w-6 items-center justify-center rounded-lg border-0 bg-transparent p-0"
          )}
          key={k}
          onClick={() => onGo(k)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2 rounded-full transition-[width,background-color] duration-300",
              k === index ? "w-5 bg-ink" : "w-2 bg-line2"
            )}
          />
        </button>
      ))}
    </div>
  );
}
