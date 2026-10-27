"use client";

import AppError from "./error";

import "./globals.css";

/** Erro no root layout: substitui o documento inteiro, por isso traz `<html>`, `<body>` e o CSS. */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AppError {...props} />
      </body>
    </html>
  );
}
