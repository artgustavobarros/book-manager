"use client";

import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { AppModals } from "./app-modals";
import { RestoreHost } from "./restore-host";
import { Toaster } from "./toast";

/** Estrutura das páginas autenticadas (Acervo.dc.html, bloco `authed`). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink transition-[background-color,color] duration-300">
      <AppHeader />
      {children}
      <AppFooter />
      <Toaster />
      <RestoreHost />
      <AppModals />
    </div>
  );
}

/** Container de página: max 1440px, padding 28/28/56, gap 16. */
export function PageMain({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-7 pt-7 pb-14">{children}</main>;
}
