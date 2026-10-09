"use client";

import { cn } from "cn";
import { type CSSProperties, useEffect } from "react";
import { toast as sonnerToast, useSonner } from "sonner";

import { Toaster as SonnerToaster } from "@/components/ui/sonner";

/**
 * Toast do design sobre o Sonner: um por vez, card com ícone do tipo, mensagem,
 * nota opcional, botão de fechar e barra de tempo restante.
 */
export type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  /** Texto secundário abaixo da mensagem. */
  note?: string;
  type?: ToastType;
}

const PENDING_NOTE =
  "Seus dados foram salvos, mas o cadastro ainda não está completo: confirme seu e-mail.";

/** Atualizado pelo <Toaster>: e-mail da conta ainda não confirmado. */
let pendingVerification = false;

function duration(type: ToastType, note: string) {
  if (type === "error") {
    return 6000;
  }
  return note ? 4800 : 3000;
}

export function toast(msg: string, options: ToastOptions = {}) {
  const type = options.type ?? "success";
  const note =
    options.note ??
    (type === "success" && pendingVerification ? PENDING_NOTE : "");
  const ms = duration(type, note);
  // Um por vez: o novo substitui o atual.
  sonnerToast.dismiss();
  sonnerToast[type](msg, {
    description: note || undefined,
    duration: ms,
    // Duração da barra de tempo restante (o ::after do card).
    style: { "--toast-ms": `${ms}ms` } as CSSProperties,
  });
}

/** Há um toast visível (os botões flutuantes não se escondem enquanto isso). */
export function useToastVisible() {
  return useSonner().toasts.length > 0;
}

const iconClass =
  "flex size-7 flex-none items-center justify-center rounded-full font-bold text-sm leading-none";

/** Ícone de cada tipo (`--toast-*` em app/styles/tokens/colors.css). */
const ICONS = {
  success: (
    <span
      aria-hidden="true"
      className={cn(iconClass, "bg-toast-success/14 text-toast-success")}
    >
      ✓
    </span>
  ),
  error: (
    <span
      aria-hidden="true"
      className={cn(iconClass, "bg-toast-error/14 text-toast-error")}
    >
      !
    </span>
  ),
  warning: (
    <span
      aria-hidden="true"
      className={cn(iconClass, "bg-toast-warning-tint/20 text-toast-warning")}
    >
      !
    </span>
  ),
  info: (
    <span
      aria-hidden="true"
      className={cn(iconClass, "bg-toast-info/14 text-toast-info")}
    >
      i
    </span>
  ),
  close: <span aria-hidden="true">✕</span>,
};

export function Toaster({
  pendingVerification: pending,
}: {
  pendingVerification: boolean;
}) {
  useEffect(() => {
    pendingVerification = pending;
  }, [pending]);
  return (
    <SonnerToaster
      closeButton
      containerAriaLabel="Notificações"
      icons={ICONS}
      // Desktop: centralizado. Até 600px: à esquerda da coluna de botões flutuantes.
      mobileOffset={{ bottom: 16, left: 16, right: 88 }}
      offset={{ bottom: 28 }}
      position="bottom-center"
      style={{ "--width": "min(440px, calc(100vw - 40px))" } as CSSProperties}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: "Fechar notificação",
        classNames: {
          // O CSS do Sonner fica fora das @layer e supõe offsets simétricos no mobile:
          // a largura descontando os dois lados precisa de `!`.
          toast:
            "flex w-full max-[600px]:w-[calc(100%-var(--mobile-offset-left)-var(--mobile-offset-right))]! items-start font-sans gap-3 overflow-hidden rounded-xl border border-line bg-card py-3.5 pr-3 pb-4 pl-3.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,.14),0_2px_6px_rgba(0,0,0,.06)] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:opacity-55 after:[animation:acv-toast-bar_var(--toast-ms)_linear_both] data-[expanded=true]:after:[animation-play-state:paused]",
          success: "after:bg-toast-success",
          error: "after:bg-toast-error",
          warning: "after:bg-toast-warning",
          info: "after:bg-toast-info",
          content: "min-w-0 flex-1 pt-1",
          title: "text-pretty font-semibold text-sm leading-5",
          description:
            "mt-0.5 text-pretty text-[13px] text-mute leading-[18px]",
          closeButton:
            "order-last flex size-7 flex-none items-center justify-center rounded-lg border-0 bg-transparent text-mute text-sm transition-colors duration-200 hover:bg-acc/10 hover:text-acc focus-visible:shadow-ring",
        },
      }}
      visibleToasts={1}
    />
  );
}
