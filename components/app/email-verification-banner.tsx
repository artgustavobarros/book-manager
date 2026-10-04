"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { api } from "@/lib/client/api";

import { useApp } from "./app-provider";

function focusMain() {
  document.getElementById("conteudo-principal")?.focus();
}

/** Aviso por página: o key no AppShell reinicia o fechamento em cada navegação. */
export function EmailVerificationBanner() {
  const { user, setUser } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  // O layout compartilhado pode manter um valor antigo após a verificação em outra aba.
  useEffect(() => {
    if (user.emailVerified) {
      return;
    }
    let active = true;
    const check = async () => {
      try {
        const result = await api.get<{ emailVerified: boolean }>(
          "/api/account/verification"
        );
        if (active && result.emailVerified) {
          setUser({ emailVerified: true });
        }
      } catch {
        // A ação explícita “Já confirmei” mostra erros; a consulta automática não interrompe a página.
      }
    };
    const onFocus = () => {
      void check();
    };
    void check();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [setUser, user.emailVerified]);

  if (user.emailVerified || dismissed) {
    return null;
  }

  const checkNow = async () => {
    if (checking) {
      return;
    }
    setChecking(true);
    setMessage("");
    try {
      const result = await api.get<{ emailVerified: boolean }>(
        "/api/account/verification"
      );
      if (result.emailVerified) {
        setUser({ emailVerified: true });
        focusMain();
      } else {
        setMessage(
          "A confirmação ainda não consta. Confira o link no seu e-mail."
        );
        setMessageError(false);
      }
    } catch {
      setMessage("Não foi possível conferir agora. Tente novamente.");
      setMessageError(true);
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    if (resending) {
      return;
    }
    setResending(true);
    setMessage("");
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: "/verifique-email",
      });
      if (error) {
        setMessage(authErrorMessage(error));
        setMessageError(true);
      } else {
        setMessage("Enviamos um novo link. Confira também o spam.");
        setMessageError(false);
      }
    } catch {
      setMessage("Não foi possível reenviar agora. Tente novamente.");
      setMessageError(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <section
      aria-label="Confirmação de e-mail pendente"
      className="border-line border-b bg-card text-ink"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-3 px-7 py-3 max-[640px]:px-4">
        <span
          aria-hidden="true"
          className="size-2 flex-none rounded-full bg-acc"
        />
        <p className="min-w-0 flex-1 text-sm leading-5 max-[640px]:basis-[calc(100%-2rem)]">
          <strong className="font-semibold">Falta confirmar seu e-mail.</strong>{" "}
          Enviamos um link para {user.email}. Você já pode usar o acervo
          normalmente, e tudo o que fizer fica salvo, mas o cadastro só fica
          completo após a confirmação.
        </p>
        <div className="flex flex-wrap items-center gap-2 max-[640px]:ml-5">
          <Button
            disabled={resending}
            onClick={() => void resend()}
            size="sm"
            variant="neutral"
          >
            {resending ? "Reenviando…" : "Reenviar e-mail"}
          </Button>
          <Button disabled={checking} onClick={() => void checkNow()} size="sm">
            {checking ? "Conferindo…" : "Já confirmei"}
          </Button>
          <button
            aria-label="Fechar aviso de confirmação"
            className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent text-mute hover:bg-hov hover:text-ink focus-visible:shadow-ring"
            onClick={() => {
              setDismissed(true);
              focusMain();
            }}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {message ? (
          <p
            className="w-full pl-7 text-sm max-[640px]:pl-5"
            role={messageError ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
