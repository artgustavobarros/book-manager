"use client";

import { cn } from "cn";

import { useApp } from "@/components/app/app-provider";
import { coverColors, coverImage } from "@/lib/domain/cover";
import { stat } from "@/lib/domain/status";
import type { Book } from "@/lib/domain/types";

import { LentBadge } from "./lent-badge";
import { StatusSelect } from "./status-select";

/** Card da vista "Capas" (capa 2:3 com ações no hover + metadados). */
export function BookCard({
  book: b,
  delayMs,
  onAuthor,
  coverRef,
}: {
  book: Book;
  delayMs: number;
  onAuthor: (author: string) => void;
  coverRef?: React.RefCallback<HTMLElement>;
}) {
  const app = useApp();
  const { coverBg, coverInk } = coverColors(b.title, b.author);
  const st = stat(b.status);
  const author = b.author || "Autor desconhecido";
  const actions: [string, string, () => void, boolean][] = [
    [b.favorite ? "♥" : "♡", b.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos", () => app.toggleFavorite(b), b.favorite],
    ["✓", b.status === "lido" ? "Marcar como não lido" : "Marcar como lido", () => app.toggleRead(b), b.status === "lido"],
    ["✎", "Editar", () => app.openEdit(b.id), false],
  ];
  return (
    <div
      onClick={() => app.openView(b.id)}
      style={{ animationDelay: delayMs + "ms" }}
      className="group flex animate-acv-in cursor-pointer flex-col gap-3"
    >
      <div
        ref={coverRef}
        data-bid={b.id}
        style={{ background: coverBg, color: coverInk }}
        className="relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-md px-3 py-4 shadow-book"
      >
        <span className="text-xs font-semibold tracking-[.1em] uppercase opacity-80">{author}</span>
        <span className="text-xl leading-[1.08] font-bold text-balance">{b.title}</span>
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: coverImage(b.coverUrl) }} />
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-[rgba(20,19,17,.72)] px-2 py-1 text-xs font-semibold text-white">
          <span className="size-2 rounded-full" style={{ background: st.dot }} />
          {st.label}
        </span>
        {b.favorite ? (
          <span className="absolute top-2 right-2 text-sm text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)] group-hover:hidden">♥</span>
        ) : null}
        <div className="pointer-events-none absolute top-2 right-2 z-[2] flex translate-x-[10px] flex-col gap-2 opacity-0 transition-[opacity,transform] duration-200 ease-[ease] group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100">
          {actions.map(([glyph, label, fn, on]) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={(e) => {
                e.stopPropagation();
                fn();
              }}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-0 text-base leading-none shadow-[0_2px_8px_rgba(27,26,23,.2)] transition-[background-color,color] duration-150 active:scale-[.86]",
                on ? "bg-[#1b1a17] text-white" : "bg-white text-[#1b1a17]",
              )}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold text-mute tabular-nums">{b.orderNo ? "#" + b.orderNo : "—"}</span>
        <span className="text-sm leading-[1.25] font-semibold text-pretty">{b.title}</span>
        <span
          title="Ver todos os livros deste autor"
          onClick={(e) => {
            e.stopPropagation();
            onAuthor(author);
          }}
          className="cursor-pointer self-start text-xs text-mute hover:text-acc hover:underline"
        >
          {author}
        </span>
        <span className="truncate text-xs text-mute">
          {[b.publisher, b.nationality, b.genre].filter(Boolean).join(" · ")}
        </span>
        {b.status === "emprestado" && b.borrower ? <LentBadge borrower={b.borrower} className="mt-0.5 py-0.5" /> : null}
        <StatusSelect value={b.status} onChange={(k) => app.setStatus(b, k)} className="mt-2 self-start" />
      </div>
    </div>
  );
}
