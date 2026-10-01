"use client";

import { cn } from "cn";
import { useState } from "react";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Botão ☾/☀: aplica `data-theme` no <html> e salva no cookie, que o root layout lê
 * no SSR (sem flash). `initial` vem desse mesmo cookie.
 */
export function ThemeToggle({ className, initial }: { className?: string; initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Modo claro" : "Modo escuro";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.documentElement.style.colorScheme = next;
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
      }}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg border border-line2 bg-card text-base text-ink transition-[border-color] duration-150 hover:border-ink focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none",
        className,
      )}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
