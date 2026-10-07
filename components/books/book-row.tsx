"use client";

import { useApp } from "@/components/app/app-provider";
import { fmtDate } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

import { LentBadge } from "./lent-badge";
import { MiniCover } from "./mini-cover";
import { StatusSelect } from "./status-select";

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
          className="truncate border-0 bg-transparent p-0 text-left font-semibold text-ink text-sm max-[640px]:whitespace-normal"
          onClick={(e) => {
            e.stopPropagation();
            app.openView(b.id);
          }}
          type="button"
        >
          {b.title}
        </button>
        {b.status === "emprestado" && b.borrower ? (
          <LentBadge borrower={b.borrower} className="py-px" />
        ) : null}
      </span>
      <button
        className="truncate border-0 bg-transparent p-0 text-left text-ink text-sm hover:text-acc hover:underline max-[640px]:col-span-2 max-[640px]:col-start-2 max-[640px]:row-start-2"
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
      <StatusSelect
        className="min-w-0 max-[640px]:col-start-2 max-[640px]:row-start-3"
        onChange={(k) => app.setStatus(b, k)}
        selectClassName="min-w-0 flex-1"
        value={b.status}
      />
      <span className="flex justify-end gap-1 max-[640px]:col-start-3 max-[640px]:row-start-3">
        <button
          aria-label={
            b.status === "lido"
              ? "Marcar como não lido"
              : b.status === "lendo"
                ? "Concluir leitura"
                : "Começar a ler"
          }
          className="size-7 rounded-md border border-line2 bg-card text-ink text-xs hover:border-ink max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            app.cycleStatus(b);
          }}
          title={
            b.status === "lido"
              ? "Marcar como não lido"
              : b.status === "lendo"
                ? "Concluir leitura"
                : "Começar a ler"
          }
          type="button"
        >
          {b.status === "lido" ? "↺" : b.status === "lendo" ? "✓" : "▶"}
        </button>
        <button
          aria-label="Editar"
          className="size-7 rounded-md border border-line2 bg-card text-ink text-sm hover:border-ink max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            app.openEdit(b.id);
          }}
          title="Editar"
          type="button"
        >
          ✎
        </button>
        <button
          aria-label="Excluir"
          className="size-7 rounded-md border border-line2 bg-card text-acc text-xs hover:border-acc max-[640px]:size-9"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(b);
          }}
          title="Excluir"
          type="button"
        >
          ✕
        </button>
      </span>
    </div>
  );
}
