"use client";

import { cn } from "cn";
import {
  CheckIcon,
  HeartIcon,
  type LucideIcon,
  PencilIcon,
} from "lucide-react";

import { useApp } from "@/components/app/app-provider";
import { coverColors, coverImage } from "@/lib/domain/cover";
import type { Book } from "@/lib/domain/types";

import { ReadingSelect } from "./reading-select";
import { SituationBadge } from "./situation-badge";

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
  const author = b.author || "Autor desconhecido";
  const actions: [LucideIcon, string, () => void, boolean][] = [
    [
      HeartIcon,
      b.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos",
      () => app.toggleFavorite(b),
      b.favorite,
    ],
    [
      CheckIcon,
      b.reading === "lido" ? "Marcar como não lido" : "Marcar como lido",
      () => app.toggleRead(b),
      b.reading === "lido",
    ],
    [PencilIcon, "Editar", () => app.openEdit(b.id), false],
  ];
  return (
    <div
      className="group flex min-w-0 animate-acv-in cursor-pointer flex-col gap-3"
      onClick={() => app.openView(b.id)}
      style={{ animationDelay: delayMs + "ms" }}
    >
      <div
        className="relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-md px-3 py-4 shadow-book"
        data-bid={b.id}
        ref={coverRef}
        style={{ background: coverBg, color: coverInk }}
      >
        <span className="break-words font-semibold text-xs uppercase tracking-[.1em] opacity-80">
          {author}
        </span>
        <span className="text-balance break-words font-bold font-title text-xl leading-[1.08]">
          {b.title}
        </span>
        <span
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: coverImage(b.coverUrl) }}
        />
        {/* Sem selo sobre a capa (cobria o autor): a Leitura fica no seletor abaixo. */}
        {b.favorite ? (
          <span className="absolute top-2 right-2 text-sm text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)] group-hover:hidden max-[641px]:hidden">
            ♥
          </span>
        ) : null}
        {/* Ações no hover; até 640px (toque, sem hover) ficam sempre visíveis. */}
        <div className="pointer-events-none absolute top-2 right-2 z-[2] flex translate-x-[10px] flex-col gap-2 opacity-0 transition-[opacity,transform] duration-200 ease-[ease] group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 max-[641px]:pointer-events-auto max-[641px]:translate-x-0 max-[641px]:opacity-100">
          {actions.map(([Icon, label, fn, on]) => (
            <button
              aria-label={label}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-0 text-base leading-none shadow-[0_2px_8px_rgba(27,26,23,.2)] transition-[background-color,color] duration-150 active:scale-[.86] max-[641px]:size-11",
                on ? "bg-acc text-onacc" : "bg-card text-ink"
              )}
              key={label}
              onClick={(e) => {
                e.stopPropagation();
                fn();
              }}
              title={label}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className="size-4"
                fill={on && Icon === HeartIcon ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold text-mute text-xs tabular-nums">
          {b.orderNo ? "#" + b.orderNo : "—"}
        </span>
        {/* O card inteiro abre a ficha com o mouse; o título é o alvo do teclado. */}
        <button
          className="text-pretty break-words border-0 bg-transparent p-0 text-left font-semibold text-ink text-sm leading-[1.25]"
          onClick={(e) => {
            e.stopPropagation();
            app.openView(b.id);
          }}
          type="button"
        >
          {b.title}
        </button>
        <button
          className="max-w-full cursor-pointer self-start break-words border-0 bg-transparent p-0 text-left text-mute text-xs hover:text-acc hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onAuthor(author);
          }}
          title="Ver todos os livros deste autor"
          type="button"
        >
          {author}
        </button>
        <span className="truncate text-mute text-xs">
          {[b.publisher, b.nationality, b.genre].filter(Boolean).join(" · ")}
        </span>
        <SituationBadge
          book={b}
          className="mt-0.5 py-0.5"
          onReturn={() => app.returnBook(b)}
        />
        {/* O seletor já troca a Leitura; o card não repete a ação rápida da lista. */}
        <ReadingSelect
          className="mt-2 w-full"
          onChange={(k) => app.setReading(b, k)}
          selectClassName="w-full"
          value={b.reading}
        />
      </div>
    </div>
  );
}
