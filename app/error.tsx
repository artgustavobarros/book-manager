"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { StatusScreen } from "@/components/app/status-screen";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Com digest, o erro veio do servidor e o onRequestError já o enviou com a stack.
    if (!error.digest) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <StatusScreen
      text={
        "Não foi possível carregar esta página. Tente de novo em instantes." +
        (error.digest ? " Código: " + error.digest + "." : "")
      }
      title="Algo deu errado"
    >
      <Button onClick={() => retry()} size="lg">
        Tentar de novo
      </Button>
      <a
        className="self-center font-semibold text-mute text-xs no-underline hover:text-ink"
        href="/"
      >
        Voltar ao Painel
      </a>
    </StatusScreen>
  );
}
