"use client";

import { useApp } from "@/components/app/app-provider";
import { fmtDate } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

import { LentBadge } from "./lent-badge";
import { MiniCover } from "./mini-cover";
import { StatusSelect } from "./status-select";

export const LIST_COLUMNS =
  "grid grid-cols-[40px_36px_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_52px_100px_128px_68px] gap-3 px-5 py-3";

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
  return (
    <div
      onClick={() => app.openView(b.id)}
      className={LIST_COLUMNS + " animate-[acv-fade_300ms_both] cursor-pointer items-center border-b border-row text-sm transition-[background-color] duration-150 hover:bg-hov"}
    >
      <span className="text-mute tabular-nums">{b.orderNo ? "#" + b.orderNo : "—"}</span>
      <span ref={coverRef} data-bid={b.id} className="flex">
        <MiniCover book={b} className="h-11 w-8 rounded text-xs" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold">{b.title}</span>
        {b.status === "emprestado" && b.borrower ? <LentBadge borrower={b.borrower} className="py-px" /> : null}
      </span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onAuthor(author);
        }}
        className="truncate text-ink hover:text-acc hover:underline"
      >
        {author}
      </span>
      <span className="truncate text-mute">{b.publisher || "—"}</span>
      <span className="flex min-w-0 flex-col text-mute">
        <span className="truncate">{b.genre || "—"}</span>
        <span className="text-xs capitalize">{b.nationality || "—"}</span>
      </span>
      <span className="text-mute tabular-nums">{b.yearPublished || "—"}</span>
      <span className="text-mute tabular-nums">{fmtDate(b.acquiredOn)}</span>
      <StatusSelect value={b.status} onChange={(k) => app.setStatus(b, k)} className="min-w-0" selectClassName="min-w-0 flex-1" />
      <span className="flex justify-end gap-1">
        <button
          type="button"
          title="Editar"
          aria-label="Editar"
          onClick={(e) => {
            e.stopPropagation();
            app.openEdit(b.id);
          }}
          className="size-7 rounded-md border border-line2 bg-card text-sm text-ink hover:border-ink"
        >
          ✎
        </button>
        <button
          type="button"
          title="Excluir"
          aria-label="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(b);
          }}
          className="size-7 rounded-md border border-line2 bg-card text-xs text-acc hover:border-acc"
        >
          ✕
        </button>
      </span>
    </div>
  );
}
