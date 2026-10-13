"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { useBooks } from "@/hooks/use-books";
import { type HeaderSearch, useHeaderSearch } from "@/hooks/use-header-search";

import { useApp } from "./app-provider";
import { Avatar } from "./avatar";

const TABS = [
  ["/", "Painel"],
  ["/estante", "Estante"],
  ["/dados", "Dados do acervo"],
] as const;

/** Abas Painel / Estante / Dados (controle segmentado). */
function Tabs({
  className,
  itemClassName,
}: {
  className?: string;
  itemClassName?: string;
}) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex gap-0.5 rounded-lg bg-seg p-1", className)}>
      {TABS.map(([href, label]) => {
        const active = pathname === href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg font-semibold text-sm no-underline transition-[background-color,color] duration-200",
              active
                ? "bg-card text-ink shadow-seg hover:text-ink"
                : "bg-transparent text-mute hover:text-mute",
              itemClassName
            )}
            href={href}
            key={href}
            onClick={() => window.scrollTo({ top: 0 })}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link
      className={cn(
        "flex items-center gap-3 text-ink no-underline hover:text-ink",
        className
      )}
      href="/"
    >
      <BrandMark />
      <BrandWordmark />
    </Link>
  );
}

function AccountButton({ className }: { className?: string }) {
  const app = useApp();
  return (
    <button
      aria-label="Minha conta"
      className={cn(
        "flex size-10 flex-none items-center justify-center rounded-full border-0 p-0 font-bold text-sm tracking-[.025em] transition-transform duration-100 active:scale-95",
        className
      )}
      onClick={() => app.setAccountOpen(true)}
      title="Minha conta"
      type="button"
    >
      <Avatar
        className="size-full"
        image={app.user.image}
        initials={app.initials}
      />
    </button>
  );
}

const searchClass =
  "w-full rounded-lg border bg-card text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)]";

/** Header largo (acima de 1024px): fixo, translúcido, com todas as ações. */
function WideHeader({ search }: { search: HeaderSearch }) {
  const app = useApp();
  const books = useBooks();
  const canSurprise = books.some((b) => b.status === "nao-lido");

  return (
    <header className="sticky top-0 z-[8] border-line border-b bg-hdr backdrop-blur-[10px] max-[1025px]:hidden">
      <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-4 px-7 py-3">
        <Brand />
        <div className="flex min-w-0 flex-[1_1_200px]">
          <input
            aria-label="Buscar no acervo"
            className={cn(
              searchClass,
              "h-10 max-w-[360px] border-line2 px-4 text-sm transition-[border-color,box-shadow] duration-150 focus:border-ink focus:shadow-ring"
            )}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="Buscar título, autor, editora, empréstimo, anotações…"
            value={search.query}
          />
        </div>
        <Tabs itemClassName="px-4 py-2" />
        {canSurprise ? (
          <button
            className="h-10 whitespace-nowrap rounded-lg border border-ink bg-transparent px-4 font-semibold text-ink text-sm transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-card active:scale-[.97]"
            onClick={() => app.setSurpriseOpen(true)}
            type="button"
          >
            Me surpreenda
          </button>
        ) : (
          <button
            className="h-10 cursor-not-allowed whitespace-nowrap rounded-lg border border-line2 bg-transparent px-4 font-semibold text-mute text-sm opacity-60"
            disabled
            title="Nenhum livro não lido para sortear"
            type="button"
          >
            Me surpreenda
          </button>
        )}
        <button
          className="h-10 whitespace-nowrap rounded-lg border-0 bg-acc px-4 font-semibold text-onacc text-sm transition-[background-color,transform] duration-200 hover:bg-acc2 active:scale-[.97]"
          onClick={() => app.openEdit(null)}
          type="button"
        >
          + Registrar livro
        </button>
        <ThemeToggle initial={app.theme} />
        <AccountButton />
      </div>
    </header>
  );
}

/**
 * Header compacto (até 1024px), do design de 2026-10-02: não fixo. A busca
 * abre pelo ícone; "Registrar" e "Me surpreenda" ficam nos botões flutuantes.
 */
function NarrowHeader({ search }: { search: HeaderSearch }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = open;

  useEffect(() => {
    if (shown) {
      inputRef.current?.focus();
    }
  }, [shown]);

  return (
    <header className="relative z-[8] hidden border-line border-b bg-hdr max-[1025px]:block">
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brand className="min-w-0 flex-1" />
          <button
            aria-expanded={shown}
            aria-label={shown ? "Recolher busca" : "Abrir busca"}
            className={cn(
              "flex size-11 flex-none items-center justify-center rounded-lg border bg-card text-ink transition-[border-color] duration-150",
              shown ? "border-ink" : "border-line2"
            )}
            onClick={() => {
              if (!shown) {
                return setOpen(true);
              }
              setOpen(false);
            }}
            title={shown ? "Recolher busca" : "Abrir busca"}
            type="button"
          >
            <span aria-hidden="true" className="relative block size-4">
              <span className="absolute top-0 left-0 size-[11px] rounded-full border-2 border-current" />
              <span className="absolute top-[9px] left-[11px] h-[7px] w-0.5 -rotate-45 rounded-[1px] bg-current" />
            </span>
          </button>
          <ThemeToggle className="size-11 flex-none" initial={app.theme} />
          <AccountButton className="size-11" />
        </div>
        {shown ? (
          <div className="flex gap-2">
            <input
              aria-label="Buscar no acervo"
              autoFocus
              className={cn(
                searchClass,
                "h-11 animate-acv-fade border-ink px-4 text-base shadow-[0_0_0_3px_rgba(127,120,110,.18)]"
              )}
              onChange={(e) => search.setQuery(e.target.value)}
              placeholder="Buscar título, autor, editora…"
              ref={inputRef}
              value={search.query}
            />
            <button
              aria-label="Limpar busca"
              className="min-w-11 rounded-lg border border-line2 bg-card px-2 font-semibold text-ink text-sm disabled:opacity-50"
              disabled={!search.query}
              onClick={search.clear}
              type="button"
            >
              Limpar
            </button>
          </div>
        ) : null}
        {!shown && search.query ? (
          <button
            className="self-start rounded-full border border-ink bg-card px-3 py-1 text-ink text-sm"
            onClick={() => setOpen(true)}
            type="button"
          >
            Busca: {search.query} · editar
          </button>
        ) : null}
        <Tabs itemClassName="h-11 min-w-0 flex-[1_1_auto] px-2 flex items-center justify-center" />
      </div>
    </header>
  );
}

/** Os dois headers ficam montados e dividem o mesmo rascunho da busca. */
export function AppHeader() {
  const search = useHeaderSearch();
  return (
    <>
      <WideHeader search={search} />
      <NarrowHeader search={search} />
    </>
  );
}
