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
  const [pickId, setPickId] = useState<string | null>(
    () => drawBook(surprisePool(books, "todos"), null)?.id ?? null
  );
  const { options } = useMemo(() => surpriseGenres(books), [books]);
  const pool = useMemo(() => surprisePool(books, genre), [books, genre]);
  const sb = books.find((b) => b.id === pickId) ?? null;
  const { coverBg, coverInk } = sb
    ? coverColors(sb.title, sb.author)
    : { coverBg: "var(--soft)", coverInk: "var(--mute)" };
  const draw = (g: string, last: string | null) =>
    setPickId(drawBook(surprisePool(books, g), last)?.id ?? null);
  const poolLabel =
    "Sorteado entre " +
    pool.length +
    (pool.length === 1 ? " livro não lido" : " livros não lidos");
  const meta = sb
    ? [
        sb.genre,
        sb.pages ? nf(sb.pages) + " páginas" : "",
        sb.publisher,
        sb.yearPublished,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="flex flex-wrap">
      <div className="flex max-w-full flex-[0_0_212px] items-center bg-bg p-6 max-[640px]:hidden">
        <div
          className="relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-md px-3 py-4 shadow-lift"
          style={{ background: coverBg, color: coverInk }}
        >
          <span className="font-semibold text-xs uppercase tracking-[.1em] opacity-80">
            {sb?.author ?? ""}
          </span>
          <span className="font-bold text-xl leading-[1.08]">
            {sb?.title ?? "?"}
          </span>
          <span
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: coverImage(sb?.coverUrl) }}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 px-7 py-6 max-[640px]:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-acc text-xs uppercase tracking-[.1em]">
            Me surpreenda
          </span>
          <ModalClose />
        </div>
        <label className="flex flex-col gap-2 font-medium text-mute text-xs">
          Sortear entre
          <select
            className="h-9 cursor-pointer rounded-lg border border-line2 bg-card px-3 text-ink text-sm"
            onChange={(e) => {
              setGenre(e.target.value);
              draw(e.target.value, pickId);
            }}
            value={genre}
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
            {/* Até 640px: sem a coluna da capa, o sorteado vira uma linha com capa de 84px. */}
            <div
              className="hidden animate-[acv-fade_300ms_both] items-center gap-4 max-[640px]:flex"
              key={"n" + sb.id}
            >
              <div
                className="relative flex aspect-[2/3] w-[84px] flex-none flex-col justify-between overflow-hidden rounded px-[7px] py-2 shadow-[0_6px_14px_-8px_rgba(27,26,23,.45)]"
                style={{ background: coverBg, color: coverInk }}
              >
                <span className="font-semibold text-[6px] uppercase tracking-[.1em] opacity-80">
                  {sb.author ?? ""}
                </span>
                <span className="font-bold text-xs leading-[1.08]">
                  {sb.title}
                </span>
                <span
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: coverImage(sb.coverUrl) }}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-mute text-xs">{poolLabel}</span>
                <h2 className="m-0 text-balance font-bold text-xl leading-[1.15] tracking-[-.025em]">
                  {sb.title}
                </h2>
                <span className="text-mute text-sm">{sb.author}</span>
                <span className="text-mute text-xs">{meta}</span>
              </div>
            </div>
            <div
              className="flex animate-[acv-fade_300ms_both] flex-col gap-2 max-[640px]:hidden"
              key={sb.id}
            >
              <span className="text-mute text-xs">{poolLabel}</span>
              <h2 className="m-0 text-balance font-bold text-2xl leading-[1.15] tracking-[-.025em]">
                {sb.title}
              </h2>
              <span className="text-base text-mute">{sb.author}</span>
              <span className="text-mute text-sm">{meta}</span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                className="h-11 rounded-lg border-0 bg-ink px-4 font-semibold text-card text-sm hover:bg-acc active:scale-[.98]"
                onClick={() => {
                  app.setSurpriseOpen(false);
                  void update(sb.id, { status: "lendo", borrower: null }).then(
                    (ok) => ok && toast("📖 Boa leitura: " + sb.title)
                  );
                }}
                type="button"
              >
                📖 Começar a ler agora (mudar para “Lendo”)
              </button>
              <div className="flex gap-2">
                <button
                  className="h-10 flex-1 rounded-lg border border-ink bg-transparent px-3 font-semibold text-ink text-sm hover:bg-hov active:scale-[.98]"
                  onClick={() => draw(genre, sb.id)}
                  type="button"
                >
                  🎲 Sortear outro livro
                </button>
                <button
                  className="h-10 flex-none rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
                  onClick={() => app.openEdit(sb.id)}
                  type="button"
                >
                  Editar ficha
                </button>
              </div>
            </div>
          </>
        ) : (
          <span className="text-mute text-sm leading-[1.5]">
            Não há livros “Não lido” nesta seleção.
          </span>
        )}
      </div>
    </div>
  );
}

export function SurpriseModal() {
  const app = useApp();
  return (
    <Modal
      className="max-w-[680px]"
      onOpenChange={app.setSurpriseOpen}
      open={app.surpriseOpen}
      title="Me surpreenda"
      veilClassName="z-[35] py-[60px]"
    >
      {app.surpriseOpen ? <SurpriseBody /> : null}
    </Modal>
  );
}
