"use client";

import { cn } from "cn";
import { LayoutGridIcon, ListIcon } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useMemo, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { BookCard } from "@/components/books/book-card";
import { BookRow, LIST_COLUMNS } from "@/components/books/book-row";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Segmented, segClass } from "@/components/ui/segmented";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAutoCovers } from "@/hooks/use-auto-covers";
import { useBackup } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { useShelfState } from "@/hooks/use-shelf-state";
import {
  DEFAULT_SHELF,
  facetLabel,
  filterBooks,
  type ShelfView,
  SORT_GROUPS,
  SORT_LABELS,
  type SortKey,
  shelfChips,
  sortBooks,
} from "@/lib/domain/shelf";
import { nf } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

import { toast } from "../app/toast";

const PAGE = 18;
/** Largura mínima do card de capa fora da faixa mobile (160px). */
const CARD_MIN = 160;

function SortMenu({
  sort,
  onSort,
}: {
  sort: SortKey;
  onSort: (k: SortKey) => void;
}) {
  // Até 640px o gatilho mostra só "Ordenar" até a pessoa escolher outra ordenação.
  const chosen = sort !== DEFAULT_SHELF.sort;
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <button
          className="flex h-9 items-center gap-2 rounded-full border border-line2 bg-card pr-3 pl-4 text-ink text-sm transition-[border-color] duration-200 hover:border-ink max-[640px]:min-h-11"
          type="button"
        >
          <span className={cn("text-mute", chosen && "max-[640px]:sr-only")}>
            Ordenar
          </span>
          <span
            className={cn("font-semibold", !chosen && "max-[640px]:hidden")}
          >
            {SORT_LABELS[sort]}
          </span>
          <span
            className={cn(
              "inline-block text-mute text-xs transition-transform duration-200",
              open && "rotate-180"
            )}
          >
            ▾
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          aria-label="Ordenar"
          className="z-[41] flex w-[272px] max-w-[calc(100vw-32px)] animate-[acv-fade_200ms_both] flex-col gap-0.5 rounded-2xl border border-line2 bg-card p-2 text-ink shadow-popover outline-none"
          sideOffset={8}
        >
          {SORT_GROUPS.map((g) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg py-2 pr-2 pl-3"
              key={g.label}
            >
              <span className="font-medium text-ink text-sm">{g.label}</span>
              <div className="flex gap-0.5 rounded-lg bg-seg p-0.5">
                {g.opts.map(([k, l]) => (
                  <button
                    aria-pressed={sort === k}
                    className={cn(
                      "whitespace-nowrap rounded-md border-0 px-2 py-1 font-semibold text-xs",
                      segClass(sort === k)
                    )}
                    key={k}
                    onClick={() => {
                      onSort(k);
                      setOpen(false);
                    }}
                    title={g.label + " " + l}
                    type="button"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function EmptyCard({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-card px-5 py-16 text-center">
      <span className="font-semibold text-lg">{title}</span>
      <span className="max-w-[380px] text-pretty text-mute text-sm leading-[1.5]">
        {text}
      </span>
      {children}
    </div>
  );
}

export function ShelfPage() {
  const app = useApp();
  const books = useBooks();
  const { remove } = useBookActions();
  const backup = useBackup();
  const { state, setShelf, goShelf } = useShelfState();
  const [toDelete, setToDelete] = useState<Book | null>(null);
  const coverRef = useAutoCovers();
  const chipDrag = useDragScroll<HTMLDivElement>();

  const list = useMemo(
    () =>
      sortBooks(
        filterBooks(books, {
          q: state.q,
          status: state.status,
          facet: state.facet,
        }),
        state.sort
      ),
    [books, state.q, state.status, state.facet, state.sort]
  );
  const chips = useMemo(() => shelfChips(books), [books]);

  const byAuthor = (name: string) =>
    goShelf({ facet: { kind: "autor", value: name } });
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE));
  const currentPage = Math.min(state.page, pageCount);
  useEffect(() => {
    const url = new URL(window.location.href);
    const canonical = currentPage > 1 ? String(currentPage) : null;
    if (url.searchParams.get("pagina") === canonical) {
      return;
    }
    if (canonical) {
      url.searchParams.set("pagina", canonical);
    } else {
      url.searchParams.delete("pagina");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [currentPage]);
  const first = (currentPage - 1) * PAGE;
  const visible = list.slice(first, first + PAGE);
  const shelfEmpty = books.length === 0;
  const noMatch = !shelfEmpty && list.length === 0;

  return (
    <PageMain>
      <div className="flex flex-wrap items-end justify-between gap-4 max-[640px]:flex-nowrap max-[640px]:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-mute text-sm max-[640px]:hidden">
            {(list.length === books.length
              ? nf(books.length)
              : nf(list.length) + " de " + nf(books.length)) +
              (books.length === 1 ? " livro" : " livros")}
          </span>
          <h1 className="m-0 font-bold font-title text-3xl">Estante</h1>
        </div>
        {shelfEmpty ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <SortMenu onSort={(sort) => setShelf({ sort })} sort={state.sort} />
            <Segmented<ShelfView>
              className="rounded-lg p-1 max-[640px]:hidden"
              itemClassName="rounded-lg px-3 py-2 text-sm"
              label="Visualização"
              onChange={(view) => setShelf({ view })}
              options={[
                ["grid", "Capas"],
                ["list", "Lista"],
              ]}
              value={state.view}
            />
          </div>
        )}
      </div>

      {shelfEmpty ? null : (
        <div
          {...chipDrag}
          className="scrollbar-none flex flex-wrap items-center gap-2 max-[640px]:mx-[-16px] max-[640px]:cursor-grab max-[640px]:snap-x max-[640px]:scroll-px-4 max-[640px]:flex-nowrap max-[640px]:overflow-x-auto max-[640px]:px-4 max-[640px]:data-[dragging=true]:cursor-grabbing max-[640px]:data-[dragging=true]:select-none max-[640px]:data-[dragging=true]:snap-none"
        >
          {state.facet ? (
            <button
              className="flex h-8 flex-none animate-[acv-fade_300ms_both] snap-start items-center gap-2 whitespace-nowrap rounded-full border-0 bg-acc px-3 font-semibold text-sm text-white active:scale-95"
              onClick={() => setShelf({ facet: null })}
              type="button"
            >
              <span>{facetLabel(state.facet)}</span>
              <span className="opacity-80">✕</span>
            </button>
          ) : null}
          {chips.map((c) => {
            const on = state.status === c.k;
            return (
              <button
                aria-pressed={on}
                className={cn(
                  "flex h-8 flex-none snap-start items-center gap-2 whitespace-nowrap rounded-full border px-3 font-medium text-sm transition-[background-color,color,border-color] duration-200 active:scale-95 max-[640px]:min-h-10",
                  on
                    ? "border-ink bg-ink text-card"
                    : "border-line2 bg-card text-ink"
                )}
                key={c.k}
                onClick={() => setShelf({ status: c.k })}
                type="button"
              >
                {c.dot ? (
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: c.dot }}
                  />
                ) : null}
                <span>{c.label}</span>
                <span className="tabular-nums">{c.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {shelfEmpty ? (
        <EmptyCard
          text="Registre o primeiro livro ou traga o acervo da sua planilha."
          title="Sua estante está vazia"
        >
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              className="h-10 rounded-lg border-0 bg-acc px-5 font-semibold text-onacc text-sm hover:bg-acc2"
              onClick={() => app.openEdit(null)}
              type="button"
            >
              + Registrar livro
            </button>
            <button
              className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
              onClick={() => app.setSyncOpen(true)}
              type="button"
            >
              Sincronizar planilha
            </button>
            <button
              className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
              onClick={backup.pickRestore}
              type="button"
            >
              Restaurar backup
            </button>
          </div>
        </EmptyCard>
      ) : null}
      {noMatch ? (
        <EmptyCard
          text="Nenhum livro corresponde à busca e aos filtros atuais."
          title="Nenhum livro encontrado"
        >
          <button
            className="mt-3 h-10 rounded-lg border border-ink bg-transparent px-4 font-semibold text-ink text-sm transition-[background-color,color] duration-200 hover:bg-ink hover:text-card"
            onClick={() => setShelf({ q: "", status: "todos", facet: null })}
            type="button"
          >
            Limpar filtros
          </button>
        </EmptyCard>
      ) : null}

      {list.length > 0 ? (
        <div className="hidden justify-end max-[640px]:flex">
          <ToggleGroup
            aria-label="Visualização"
            className="gap-0.5 rounded-lg bg-seg p-0.5"
            onValueChange={(v) => {
              const view = v[0] as ShelfView | undefined;
              if (view) {
                setShelf({ view });
              }
            }}
            value={[state.view]}
          >
            {(
              [
                ["grid", "Capas", LayoutGridIcon],
                ["list", "Lista", ListIcon],
              ] as const
            ).map(([k, label, Icon]) => (
              <ToggleGroupItem
                aria-label={label}
                className={cn(
                  "size-11 rounded-md hover:bg-transparent aria-pressed:bg-card",
                  segClass(state.view === k)
                )}
                key={k}
                title={label}
                value={k}
              >
                <Icon aria-hidden="true" className="size-5" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {state.view === "grid" && list.length > 0 ? (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-min),1fr))] gap-x-5 gap-y-7 pt-2 max-[641px]:grid-cols-2 max-[641px]:gap-x-3"
          style={{ "--card-min": CARD_MIN + "px" } as React.CSSProperties}
        >
          {visible.map((b, i) => (
            <BookCard
              book={b}
              coverRef={coverRef}
              delayMs={(i % PAGE) * 20}
              key={b.id}
              onAuthor={byAuthor}
            />
          ))}
        </div>
      ) : null}

      {state.view === "list" && list.length > 0 ? (
        <div>
          <p className="mb-2 hidden text-mute text-xs min-[641px]:max-[1120px]:block">
            Deslize para ver todas as colunas e ações da lista.
          </p>
          <div
            aria-label="Lista de livros; deslize para ver mais colunas"
            className="overflow-x-auto rounded-xl border border-line bg-card max-[640px]:overflow-visible"
            role="region"
            tabIndex={0}
          >
            <div className="flex min-w-[1120px] flex-col max-[640px]:min-w-0">
              <div
                className={
                  LIST_COLUMNS +
                  "border-line border-b bg-hov font-semibold text-mute text-xs max-[640px]:hidden"
                }
              >
                <span>#</span>
                <span />
                <span>Título</span>
                <span>Autor(a)</span>
                <span>Editora</span>
                <span>Gênero / país</span>
                <span>Ano</span>
                <span>Aquisição</span>
                <span>Status</span>
                <span />
              </div>
              {visible.map((b) => (
                <BookRow
                  book={b}
                  coverRef={coverRef}
                  key={b.id}
                  onAuthor={byAuthor}
                  onDelete={setToDelete}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {list.length > 0 ? (
        <nav
          aria-label="Páginas da estante"
          className="flex flex-wrap items-center justify-center gap-2 pt-5 text-sm"
        >
          <span className="w-full text-center text-mute">
            Mostrando {first + 1}–{Math.min(first + PAGE, list.length)} de{" "}
            {nf(list.length)} livros · Página {currentPage} de {pageCount}
          </span>
          <button
            aria-label="Primeira página"
            className="min-h-11 rounded-lg border border-line2 bg-card px-3 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => {
              setShelf({ page: 1 });
              window.scrollTo({ top: 0 });
            }}
            type="button"
          >
            Primeira
          </button>
          <button
            aria-label="Página anterior"
            className="min-h-11 rounded-lg border border-line2 bg-card px-3 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => {
              setShelf({ page: currentPage - 1 });
              window.scrollTo({ top: 0 });
            }}
            type="button"
          >
            Anterior
          </button>
          {Array.from(
            { length: Math.min(3, pageCount) },
            (_, i) => Math.max(1, Math.min(pageCount - 2, currentPage - 1)) + i
          ).map((number) => (
            <button
              aria-current={number === currentPage ? "page" : undefined}
              aria-label={`Página ${number}`}
              className={cn(
                "min-h-11 min-w-11 rounded-lg border px-3",
                number === currentPage
                  ? "border-ink bg-ink text-card"
                  : "border-line2 bg-card text-ink"
              )}
              key={number}
              onClick={() => {
                setShelf({ page: number });
                window.scrollTo({ top: 0 });
              }}
              type="button"
            >
              {number}
            </button>
          ))}
          <button
            aria-label="Próxima página"
            className="min-h-11 rounded-lg border border-line2 bg-card px-3 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === pageCount}
            onClick={() => {
              setShelf({ page: currentPage + 1 });
              window.scrollTo({ top: 0 });
            }}
            type="button"
          >
            Próxima
          </button>
          <button
            aria-label="Última página"
            className="min-h-11 rounded-lg border border-line2 bg-card px-3 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === pageCount}
            onClick={() => {
              setShelf({ page: pageCount });
              window.scrollTo({ top: 0 });
            }}
            type="button"
          >
            Última
          </button>
        </nav>
      ) : null}

      <ConfirmDialog
        confirmLabel="Excluir"
        description={
          toDelete
            ? `Excluir “${toDelete.title}” do acervo? Esta ação não pode ser desfeita.`
            : ""
        }
        onConfirm={() => {
          const b = toDelete!;
          setToDelete(null);
          void remove(b.id).then(
            (ok) => ok && toast("Livro excluído", { type: "info" })
          );
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
        open={!!toDelete}
        title="Excluir livro?"
      />
    </PageMain>
  );
}
