"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import { useBooks } from "@/hooks/use-books";

import { useApp } from "./app-provider";
import { useToastVisible } from "./toast";

/** Abaixo disso os botões sempre aparecem; acima, rolar para baixo os esconde. */
const TOP_ZONE = 80;
/** Rolagens menores que isso não trocam o estado (evita piscar). */
const THRESHOLD = 8;

/** Esconde ao rolar para baixo e mostra ao rolar para cima ou perto do topo. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= TOP_ZONE) {
        setHidden(false);
        last = y;
        return;
      }
      if (Math.abs(y - last) < THRESHOLD) {
        return;
      }
      setHidden(y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

/**
 * "Me surpreenda" (🎲, 48px) e "Registrar livro" (+, 56px) flutuando no canto, só até
 * 640px de largura (design de 2026-10-02), onde o header não tem essas ações.
 */
export function MobileFabs() {
  const app = useApp();
  const books = useBooks();
  // Com um toast na tela os botões ficam visíveis: o toast se alinha ao lado deles.
  const toastVisible = useToastVisible();
  const hidden = useHideOnScroll() && !toastVisible;
  const canSurprise = books.some((b) => b.status === "nao-lido");

  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed right-4 bottom-4 z-20 hidden flex-col items-center gap-3 transition-[transform,opacity] duration-200 ease-out max-[640px]:flex",
        hidden && "pointer-events-none translate-y-[calc(100%+16px)] opacity-0"
      )}
      data-hidden={hidden ? "true" : undefined}
      data-slot="mobile-fabs"
      inert={hidden}
    >
      {canSurprise ? (
        <button
          aria-label="Me surpreenda"
          className="flex size-12 items-center justify-center rounded-full border border-ink bg-card text-ink text-xl shadow-[0_4px_12px_rgba(27,26,23,.18)] transition-transform duration-100 active:scale-[.92]"
          onClick={() => app.setSurpriseOpen(true)}
          title="Me surpreenda"
          type="button"
        >
          🎲
        </button>
      ) : (
        <button
          aria-label="Me surpreenda (indisponível)"
          className="flex size-12 cursor-not-allowed items-center justify-center rounded-full border border-line2 bg-card text-xl opacity-50 grayscale"
          disabled
          title="Nenhum livro não lido para sortear"
          type="button"
        >
          🎲
        </button>
      )}
      <button
        aria-label="Registrar livro"
        className="flex size-14 items-center justify-center rounded-full border-0 bg-acc font-normal text-[28px] text-onacc leading-none shadow-[0_8px_20px_-6px_rgba(27,26,23,.5)] transition-[background-color,transform] duration-200 active:scale-[.92] active:bg-acc"
        onClick={() => app.openEdit(null)}
        title="Registrar livro"
        type="button"
      >
        +
      </button>
    </div>
  );
}
