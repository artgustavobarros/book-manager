"use client";

import { useEffect } from "react";

import { parseTheme, THEME_COOKIE } from "@/lib/theme";

import AppError from "./error";

import "./globals.css";

/**
 * Erro no root layout: substitui o documento inteiro, por isso traz `<html>`, `<body>`
 * e o CSS. Sem o root layout, o tema salvo vem do cookie, lido no cliente.
 */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    const saved = document.cookie.match(
      new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`)
    )?.[1];
    const theme = parseTheme(saved);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, []);

  return (
    <html lang="pt-BR">
      <body>
        <AppError {...props} />
      </body>
    </html>
  );
}
