"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";

import { useApp } from "./app-provider";

const TABS = [
  ["/", "Painel"],
  ["/estante", "Estante"],
  ["/dados", "Dados do acervo"],
] as const;

export function AppHeader() {
  const app = useApp();
  const books = useBooks();
  const pathname = usePathname();
  const { state, setShelf } = useShelfState();
  const canSurprise = books.some((b) => b.status === "nao-lido");

  return (
    <header className="sticky top-0 z-[8] border-b border-line bg-hdr backdrop-blur-[10px]">
      <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-4 px-7 py-3">
        <Link href="/" className="flex items-center gap-3 text-ink no-underline hover:text-ink">
          <BrandMark />
          <span className="text-lg font-bold">Bodega Literária</span>
        </Link>
        <div className="flex min-w-0 flex-[1_1_200px]">
          <input
            aria-label="Buscar no acervo"
            value={state.q}
            onChange={(e) => setShelf({ q: e.target.value })}
            placeholder="Buscar título, autor, editora, empréstimo, anotações…"
            className="h-10 w-full max-w-[360px] rounded-lg border border-line2 bg-card px-4 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink focus:shadow-ring"
          />
        </div>
        <nav className="flex gap-0.5 rounded-lg bg-seg p-1">
          {TABS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => window.scrollTo({ top: 0 })}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap no-underline transition-[background-color,color] duration-200",
                  active ? "bg-card text-ink shadow-seg hover:text-ink" : "bg-transparent text-mute hover:text-mute",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        {canSurprise ? (
          <button
            type="button"
            onClick={() => app.setSurpriseOpen(true)}
            className="h-10 rounded-lg border border-ink bg-transparent px-4 text-sm font-semibold whitespace-nowrap text-ink transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-card active:scale-[.97]"
          >
            Me surpreenda
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Nenhum livro não lido para sortear"
            className="h-10 cursor-not-allowed rounded-lg border border-line2 bg-transparent px-4 text-sm font-semibold whitespace-nowrap text-mute opacity-60"
          >
            Me surpreenda
          </button>
        )}
        <button
          type="button"
          onClick={() => app.openEdit(null)}
          className="h-10 rounded-lg border-0 bg-ink px-4 text-sm font-semibold whitespace-nowrap text-card transition-[background-color,transform] duration-200 hover:bg-acc active:scale-[.97]"
        >
          + Registrar livro
        </button>
        <ThemeToggle initial={app.theme} />
        <button
          type="button"
          title="Minha conta"
          aria-label="Minha conta"
          onClick={() => app.setAccountOpen(true)}
          className="flex size-10 items-center justify-center rounded-full border-0 bg-acc text-sm font-bold tracking-[.025em] text-white transition-transform duration-100 active:scale-95"
        >
          {app.initials}
        </button>
      </div>
    </header>
  );
}
