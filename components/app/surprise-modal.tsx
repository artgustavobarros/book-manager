"use client";

import { useMemo, useState } from "react";

import { Modal, ModalClose } from "@/components/ui/dialog";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { coverColors, coverImage } from "@/lib/domain/cover";
import { drawBook, surpriseGenres, surprisePool } from "@/lib/domain/surprise";
import { nf } from "@/lib/domain/text";

import { useApp } from "./app-provider";
import { toast } from "./toast";

function SurpriseBody() {
  const app = useApp();
  const books = useBooks();
  const { update } = useBookActions();
  const [genre, setGenre] = useState("todos");
  const [pickId, setPickId] = useState<string | null>(() => drawBook(surprisePool(books, "todos"), null)?.id ?? null);
  const { options } = useMemo(() => surpriseGenres(books), [books]);
  const pool = useMemo(() => surprisePool(books, genre), [books, genre]);
  const sb = books.find((b) => b.id === pickId) ?? null;
  const { coverBg, coverInk } = sb ? coverColors(sb.title, sb.author) : { coverBg: "var(--soft)", coverInk: "var(--mute)" };
  const draw = (g: string, last: string | null) => setPickId(drawBook(surprisePool(books, g), last)?.id ?? null);

  return (
    <div className="flex flex-wrap">
      <div className="flex max-w-full flex-[0_0_212px] items-center bg-bg p-6">
        <div
          style={{ background: coverBg, color: coverInk }}
          className="relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-md px-3 py-4 shadow-lift"
        >
          <span className="text-xs font-semibold tracking-[.1em] uppercase opacity-80">{sb?.author ?? ""}</span>
          <span className="text-xl leading-[1.08] font-bold">{sb?.title ?? "?"}</span>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: coverImage(sb?.coverUrl) }} />
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 px-7 py-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-[.1em] text-acc uppercase">Me surpreenda</span>
          <ModalClose />
        </div>
        <label className="flex flex-col gap-2 text-xs font-medium text-mute">
          Sortear entre
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              draw(e.target.value, pickId);
            }}
            className="h-9 cursor-pointer rounded-lg border border-line2 bg-card px-3 text-sm text-ink"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {sb ? (
          <>
            <div key={sb.id} className="flex animate-[acv-fade_300ms_both] flex-col gap-2">
              <span className="text-xs text-mute">
                Sorteado entre {pool.length} {pool.length === 1 ? "livro não lido" : "livros não lidos"}
              </span>
              <h2 className="m-0 text-2xl leading-[1.15] font-bold tracking-[-.025em] text-balance">{sb.title}</h2>
              <span className="text-base text-mute">{sb.author}</span>
              <span className="text-sm text-mute">
                {[sb.genre, sb.pages ? nf(sb.pages) + " páginas" : "", sb.publisher, sb.yearPublished].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  void update(sb.id, { status: "lendo", borrower: null });
                  app.setSurpriseOpen(false);
                  toast("📖 Boa leitura: " + sb.title);
                }}
                className="h-11 rounded-lg border-0 bg-ink px-4 text-sm font-semibold text-card hover:bg-acc active:scale-[.98]"
              >
                📖 Começar a ler agora (mudar para “Lendo”)
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => draw(genre, sb.id)}
                  className="h-10 flex-1 rounded-lg border border-ink bg-transparent px-3 text-sm font-semibold text-ink hover:bg-hov active:scale-[.98]"
                >
                  🎲 Sortear outro livro
                </button>
                <button
                  type="button"
                  onClick={() => app.openEdit(sb.id)}
                  className="h-10 flex-none rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
                >
                  Editar ficha
                </button>
              </div>
            </div>
          </>
        ) : (
          <span className="text-sm leading-[1.5] text-mute">Não há livros “Não lido” nesta seleção.</span>
        )}
      </div>
    </div>
  );
}

export function SurpriseModal() {
  const app = useApp();
  return (
    <Modal
      open={app.surpriseOpen}
      onOpenChange={app.setSurpriseOpen}
      title="Me surpreenda"
      className="max-w-[680px]"
      veilClassName="z-[35] py-[60px]"
    >
      {app.surpriseOpen ? <SurpriseBody /> : null}
    </Modal>
  );
}
