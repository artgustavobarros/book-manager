"use client";

import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { AppModals } from "./app-modals";
import { MobileFabs } from "./mobile-fabs";
import { RestoreHost } from "./restore-host";
import { Toaster } from "./toast";

/** Estrutura das páginas autenticadas (Acervo.dc.html, bloco `authed`). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink transition-[background-color,color] duration-300">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-ink focus:shadow-ring"
        href="#conteudo-principal"
      >
        Pular para o conteúdo
      </a>
      <AppHeader />
      {children}
      <AppFooter />
      {/* Até 640px: espaço para os botões flutuantes não cobrirem o fim da página. */}
      <div
        aria-hidden="true"
        className="hidden h-24 flex-none max-[640px]:block"
      />
      <MobileFabs />
      <Toaster />
      <RestoreHost />
      <AppModals />
    </div>
  );
}

/** Container de página: max 1440px, padding 28/28/56, gap 16. */
export function PageMain({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-7 pt-7 pb-14 max-[640px]:px-4"
      id="conteudo-principal"
      tabIndex={-1}
    >
      {children}
    </main>
  );
}
