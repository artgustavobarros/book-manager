"use client";

import { cn } from "cn";
import { useSyncExternalStore } from "react";

import { THEME_COLOR } from "@/lib/site";
import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** O tema vive no `data-theme` do <html>: todos os botões de tema leem dali. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
const currentTheme = (): Theme =>
  parseTheme(document.documentElement.dataset.theme);

/**
 * Botão ☾/☀: aplica `data-theme` no <html> e salva no cookie, que o root layout lê
 * no SSR (sem flash). `initial` vem desse mesmo cookie (usado no render do servidor).
 */
export function ThemeToggle({
  className,
  initial,
}: {
  className?: string;
  initial: Theme;
}) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Modo claro" : "Modo escuro";
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg border border-line2 bg-card text-base text-ink transition-[border-color] duration-150 hover:border-ink focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none",
        className
      )}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.documentElement.style.colorScheme = next;
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", THEME_COLOR[next]);
        // biome-ignore lint/suspicious/noDocumentCookie: The server reads this theme preference from a cookie.
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
      title={label}
      type="button"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
