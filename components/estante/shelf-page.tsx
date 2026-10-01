"use client";

import { cn } from "cn";
import { Popover } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { BookCard } from "@/components/books/book-card";
import { BookRow, LIST_COLUMNS } from "@/components/books/book-row";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Segmented, segClass } from "@/components/ui/segmented";
import { useAutoCovers } from "@/hooks/use-auto-covers";
import { useBackup } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import {
  SORT_GROUPS,
  SORT_LABELS,
  facetLabel,
  filterBooks,
  shelfChips,
  sortBooks,
  type ShelfView,
  type SortKey,
} from "@/lib/domain/shelf";
import { nf } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

import { toast } from "../app/toast";

const PAGE = 18;
/** Largura mínima do card de capa (prop `cardSize` do design: 160px). */
const CARD_MIN = 160;

function SortMenu({ sort, onSort }: { sort: SortKey; onSort: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          className="flex h-9 items-center gap-2 rounded-full border border-line2 bg-card pr-3 pl-4 text-sm text-ink transition-[border-color] duration-200 hover:border-ink"
        >
          <span className="text-mute">Ordenar</span>
          <span className="font-semibold">{SORT_LABELS[sort]}</span>
          <span className={cn("inline-block text-xs text-mute transition-transform duration-200", open && "rotate-180")}>▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          role="listbox"
          className="z-[41] flex w-[272px] max-w-[calc(100vw-32px)] animate-[acv-fade_200ms_both] flex-col gap-0.5 rounded-2xl border border-line2 bg-card p-2 text-ink shadow-popover outline-none"
        >
          {SORT_GROUPS.map((g) => (
            <div key={g.label} className="flex items-center justify-between gap-3 rounded-lg py-2 pr-2 pl-3">
              <span className="text-sm font-medium text-ink">{g.label}</span>
              <div className="flex gap-0.5 rounded-lg bg-seg p-0.5">
                {g.opts.map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    title={g.label + " " + l}
                    onClick={() => {
                      onSort(k);
                      setOpen(false);
                    }}
                    className={cn("rounded-md border-0 px-2 py-1 text-xs font-semibold whitespace-nowrap", segClass(sort === k))}
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

function EmptyCard({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-card px-5 py-16 text-center">
      <span className="text-lg font-semibold">{title}</span>
      <span className="max-w-[380px] text-sm leading-[1.5] text-pretty text-mute">{text}</span>
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

  const list = useMemo(
    () => sortBooks(filterBooks(books, { q: state.q, status: state.status, facet: state.facet }), state.sort),
    [books, state.q, state.status, state.facet, state.sort],
  );
  const chips = useMemo(() => shelfChips(books), [books]);

  // Carregamento incremental: volta a 18 quando busca/filtro/ordem mudam.
  const filterKey = JSON.stringify([state.q, state.status, state.facet, state.sort]);
  const [page, setPage] = useState({ key: filterKey, limit: PAGE, loading: false });
  if (page.key !== filterKey) setPage({ key: filterKey, limit: PAGE, loading: false });
  const hasMore = list.length > page.limit;

  const sentinel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || page.loading) return;
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        setPage((p) => ({ ...p, loading: true }));
        timer.current = setTimeout(() => setPage((p) => ({ ...p, limit: p.limit + PAGE, loading: false })), 450);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page.loading, page.limit]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const byAuthor = (name: string) => goShelf({ facet: { kind: "autor", value: name } });
  const visible = list.slice(0, page.limit);
  const shelfEmpty = books.length === 0;
  const noMatch = !shelfEmpty && list.length === 0;

  return (
    <PageMain>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-mute">
            {list.length === books.length ? nf(books.length) + " livros" : nf(list.length) + " de " + nf(books.length) + " livros"}
          </span>
          <h1 className="m-0 text-3xl font-bold tracking-[-.025em]">Estante</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SortMenu sort={state.sort} onSort={(sort) => setShelf({ sort })} />
          <Segmented<ShelfView>
            label="Visualização"
            options={[
              ["grid", "Capas"],
              ["list", "Lista"],
            ]}
            value={state.view}
            onChange={(view) => setShelf({ view })}
            className="rounded-lg p-1"
            itemClassName="rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state.facet ? (
          <button
            type="button"
            onClick={() => setShelf({ facet: null })}
            className="flex h-8 animate-[acv-fade_300ms_both] items-center gap-2 rounded-full border-0 bg-acc px-3 text-sm font-semibold text-white active:scale-95"
          >
            <span>{facetLabel(state.facet)}</span>
            <span className="opacity-80">✕</span>
          </button>
        ) : null}
        {chips.map((c) => {
          const on = state.status === c.k;
          return (
            <button
              key={c.k}
              type="button"
              aria-pressed={on}
              onClick={() => setShelf({ status: c.k })}
              className={cn(
                "flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-[background-color,color,border-color] duration-200 active:scale-95",
                on ? "border-ink bg-ink text-card" : "border-line2 bg-card text-ink",
              )}
            >
              {c.dot ? <span className="inline-block size-2 rounded-full" style={{ background: c.dot }} /> : null}
              <span>{c.label}</span>
              <span className="opacity-55 tabular-nums">{c.count}</span>
            </button>
          );
        })}
      </div>

      {shelfEmpty ? (
        <EmptyCard title="Sua estante está vazia" text="Registre o primeiro livro ou traga o acervo da sua planilha.">
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => app.openEdit(null)}
              className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc"
            >
              + Registrar livro
            </button>
            <button
              type="button"
              onClick={() => app.setSyncOpen(true)}
              className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
            >
              Sincronizar planilha
            </button>
            <button
              type="button"
              onClick={backup.pickRestore}
              className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
            >
              Restaurar backup
            </button>
          </div>
        </EmptyCard>
      ) : null}
      {noMatch ? (
        <EmptyCard title="Nenhum livro encontrado" text="Nenhum livro corresponde à busca e aos filtros atuais.">
          <button
            type="button"
            onClick={() => setShelf({ q: "", status: "todos", facet: null })}
            className="mt-3 h-10 rounded-lg border border-ink bg-transparent px-4 text-sm font-semibold text-ink transition-[background-color,color] duration-200 hover:bg-ink hover:text-card"
          >
            Limpar filtros
          </button>
        </EmptyCard>
      ) : null}

      {state.view === "grid" && list.length > 0 ? (
        <div
          className="grid gap-x-5 gap-y-7 pt-2"
          style={{ gridTemplateColumns: `repeat(auto-fill,minmax(${CARD_MIN}px,1fr))` }}
        >
          {visible.map((b, i) => (
            <BookCard key={b.id} book={b} delayMs={(i % PAGE) * 35} onAuthor={byAuthor} coverRef={coverRef} />
          ))}
        </div>
      ) : null}

      {state.view === "list" && list.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <div className="flex min-w-[1120px] flex-col">
            <div className={LIST_COLUMNS + " border-b border-line bg-hov text-xs font-semibold text-mute"}>
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
              <BookRow key={b.id} book={b} onAuthor={byAuthor} onDelete={setToDelete} coverRef={coverRef} />
            ))}
          </div>
        </div>
      ) : null}

      <div ref={sentinel} className="h-px" />
      {page.loading ? (
        <div className="flex items-center justify-center gap-3 py-7 text-sm text-mute">
          <span className="flex gap-1">
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-2 animate-acv-dot rounded-full bg-ink" style={{ animationDelay: d + "ms" }} />
            ))}
          </span>
          <span>Carregando mais livros</span>
        </div>
      ) : null}
      {!hasMore && list.length > PAGE ? (
        <div className="flex items-center gap-4 pt-7 text-sm text-mute">
          <span className="h-px flex-1 bg-line" />
          <span>Fim da estante · {list.length} livros</span>
          <span className="h-px flex-1 bg-line" />
        </div>
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir livro?"
        description={toDelete ? `Excluir “${toDelete.title}” do acervo? Esta ação não pode ser desfeita.` : ""}
        confirmLabel="Excluir"
        onConfirm={() => {
          const b = toDelete!;
          setToDelete(null);
          void remove(b.id).then(() => toast("Livro excluído"));
        }}
      />
    </PageMain>
  );
}
