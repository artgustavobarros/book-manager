"use client";

import { ShuffleIcon } from "lucide-react";

import { Modal, ModalClose } from "@/components/ui/dialog";
import { readingInfo } from "@/lib/domain/book-state";
import { nf } from "@/lib/domain/text";
import type { PublicBook } from "@/lib/domain/types";

import { PublicCover } from "./public-cover";

/** "Gênero · 288 páginas · Editora · 1979". */
export function publicMeta(b: PublicBook): string {
  return [
    b.genre,
    b.pages ? nf(b.pages) + " páginas" : "",
    b.publisher,
    b.yearPublished,
  ]
    .filter(Boolean)
    .join(" · ");
}

const primary =
  "h-11 rounded-lg border-0 bg-acc px-4 font-semibold text-onacc text-sm transition-[background-color,transform] duration-150 hover:bg-acc2 active:scale-[.98]";
const secondary =
  "h-11 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm transition-[border-color] duration-150 hover:border-ink";

/** Painel da ficha pública e do sorteio: capa à esquerda (topo no celular) e conteúdo. */
function Layout({
  book,
  eyebrow,
  children,
}: {
  book: PublicBook;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap">
      <div className="flex flex-[0_0_212px] items-center justify-center bg-bg p-6 max-[640px]:flex-[1_1_100%]">
        <PublicCover
          book={book}
          className="max-[640px]:w-[120px]"
          size="panel"
        />
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 px-7 py-6 max-[640px]:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-acc text-xs uppercase tracking-[.1em]">
            {eyebrow}
          </span>
          <ModalClose />
        </div>
        {children}
      </div>
    </div>
  );
}

function Heading({ book, above }: { book: PublicBook; above?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {above ? <span className="text-mute text-xs">{above}</span> : null}
      <h2 className="m-0 text-balance font-bold font-title text-2xl leading-[1.15]">
        {book.title}
      </h2>
      {book.author ? (
        <span className="text-base text-mute">{book.author}</span>
      ) : null}
      <span className="text-mute text-sm leading-[1.5]">
        {publicMeta(book)}
      </span>
    </div>
  );
}

/** Ficha somente leitura (sem nenhuma ação do dono). */
export function PublicBookDialog({
  book,
  ownerFirstName,
  copied,
  onClose,
  onCopy,
  onByAuthor,
}: {
  book: PublicBook | null;
  ownerFirstName: string;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onByAuthor: () => void;
}) {
  const s = book ? readingInfo(book.reading) : null;
  return (
    <Modal
      className="max-w-[680px]"
      onOpenChange={(o) => !o && onClose()}
      open={!!book}
      title={book?.title ?? "Ficha"}
    >
      {book && s ? (
        <Layout book={book} eyebrow={"Da estante de " + ownerFirstName}>
          <Heading book={book} />
          <span className="flex items-center gap-2 self-start rounded-full bg-soft px-3 py-1 font-semibold text-[13px]">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: s.dot }}
            />
            {s.label}
          </span>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <button
              className={primary + "flex-[1_1_auto]"}
              onClick={onCopy}
              type="button"
            >
              {copied ? "Link copiado ✓" : "Copiar link do livro"}
            </button>
            {book.author ? (
              <button
                className={secondary + "flex-[1_1_auto]"}
                onClick={onByAuthor}
                type="button"
              >
                Mais deste autor(a)
              </button>
            ) : null}
          </div>
        </Layout>
      ) : null}
    </Modal>
  );
}

/** Resultado do "Sortear para mim". */
export function PublicDrawDialog({
  book,
  poolLabel,
  onClose,
  onAgain,
  onOpen,
}: {
  book: PublicBook | null;
  poolLabel: string;
  onClose: () => void;
  onAgain: () => void;
  onOpen: () => void;
}) {
  return (
    <Modal
      className="max-w-[680px]"
      onOpenChange={(o) => !o && onClose()}
      open={!!book}
      title="Sorteio para você"
    >
      {book ? (
        <Layout book={book} eyebrow="Sorteio para você" key={book.id}>
          <Heading above={poolLabel} book={book} />
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              className={primary + "flex items-center justify-center gap-2"}
              onClick={onAgain}
              type="button"
            >
              <ShuffleIcon aria-hidden="true" className="size-4" />
              Sortear outro livro
            </button>
            <button className={secondary} onClick={onOpen} type="button">
              Ver ficha
            </button>
            <span className="text-center text-mute text-xs">
              O sorteio respeita a busca e os filtros aplicados.
            </span>
          </div>
        </Layout>
      ) : null}
    </Modal>
  );
}
