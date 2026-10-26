"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";

import { useApp } from "@/components/app/app-provider";
import { fmtDate } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

import { MiniCover } from "./mini-cover";
import { ReadingActionIcon, readingActionLabel } from "./reading-action";
import { ReadingSelect } from "./reading-select";
import { SituationBadge } from "./situation-badge";

export const LIST_COLUMNS =
  "grid grid-cols-[40px_36px_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_52px_100px_128px_96px] gap-3 px-5 py-3 max-[640px]:grid-cols-[40px_minmax(0,1fr)_auto] max-[640px]:gap-x-3 max-[640px]:gap-y-1 max-[640px]:px-3";

/** Linha da vista "Lista". */
export function BookRow({
  book: b,
  onAuthor,
  onDelete,
  coverRef,
}: {
  book: Book;
  onAuthor: (author: string) => void;
  onDelete: (b: Book) => void;
  coverRef?: React.RefCallback<HTMLElement>;
}) {
  const app = useApp();
  const author = b.author || "Autor desconhecido";
  const readingLabel = readingActionLabel(b.reading);
  return (
    <div
      className={
        LIST_COLUMNS +
        "animate-[acv-fade_300ms_both] cursor-pointer items-center border-row border-b text-sm transition-[background-color] duration-150 hover:bg-hov"
      }
      onClick={() => app.openView(b.id)}
    >
      <span className="text-mute tabular-nums max-[640px]:hidden">
        {b.orderNo ? "#" + b.orderNo : "—"}
      </span>
      <span
        className="flex max-[640px]:col-start-1 max-[640px]:row-span-3"
        data-bid={b.id}
        ref={coverRef}
      >
        <MiniCover book={b} className="h-11 w-8 rounded text-xs" />
      </span>
      <span className="flex min-w-0 flex-col gap-1 max-[640px]:col-span-2 max-[640px]:col-start-2 max-[640px]:row-start-1">
        {/* A linha inteira abre a ficha com o mouse; o título é o alvo do teclado. */}
        <button
          className="-mt-1.5 truncate border-0 bg-transparent px-0 pt-1.5 pb-0 text-left font-semibold text-ink text-sm max-[640px]:whitespace-normal"
          onClick={(e) => {
            e.stopPropagation();
            app.openView(b.id);
          }}
          type="button"
        >
          {b.title}
        </button>
        <SituationBadge
          book={b}
          className="py-px"
          onReturn={() => app.returnBook(b)}
        />
      </span>
      {/* Título e autor têm alvo de toque de 24px (padding com margem negativa, sem
          mexer no layout): o título cresce para cima e o autor, mais para baixo (no celular, o selo de
          emprestado fica logo acima). */}
      <button
        className="-mt-0.5 -mb-1 truncate border-0 bg-transparent px-0 pt-0.5 pb-1 text-left text-ink text-sm hover:text-acc hover:underline max-[640px]:col-span-2 max-[640px]:col-start-2 max-[640px]:row-start-2"
        onClick={(e) => {
          e.stopPropagation();
          onAuthor(author);
        }}
        title="Ver todos os livros deste autor"
        type="button"
      >
        {author}
      </button>
      <span className="truncate text-mute max-[640px]:hidden">
        {b.publisher || "—"}
      </span>
      <span className="flex min-w-0 flex-col text-mute max-[640px]:hidden">
        <span className="truncate">{b.genre || "—"}</span>
        <span className="text-xs capitalize">{b.nationality || "—"}</span>
      </span>
      <span className="text-mute tabular-nums max-[640px]:hidden">
        {b.yearPublished || "—"}
      </span>
      <span className="text-mute tabular-nums max-[640px]:hidden">
        {fmtDate(b.acquiredOn)}
      </span>
      <ReadingSelect
        className="min-w-0 max-[640px]:col-start-2 max-[640px]:row-start-3"
        onChange={(k) => app.setReading(b, k)}
        selectClassName="min-w-0 flex-1"
        value={b.reading}
      />
      <span className="flex justify-end gap-1 max-[640px]:col-start-3 max-[640px]:row-start-3">
        <button
          aria-label={readingLabel}
          className="flex size-7 items-center justify-center rounded-md border border-line2 bg-card text-ink hover:border-ink max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            app.cycleReading(b);
          }}
          title={readingLabel}
          type="button"
        >
          <ReadingActionIcon className="size-3.5" reading={b.reading} />
        </button>
        <button
          aria-label="Editar"
          className="flex size-7 items-center justify-center rounded-md border border-line2 bg-card text-ink hover:border-ink max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            app.openEdit(b.id);
          }}
          title="Editar"
          type="button"
        >
          <PencilIcon aria-hidden="true" className="size-3.5" />
        </button>
        <button
          aria-label="Excluir"
          className="flex size-7 items-center justify-center rounded-md border border-line2 bg-card text-acc hover:border-acc max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(b);
          }}
          title="Excluir"
          type="button"
        >
          <Trash2Icon aria-hidden="true" className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
