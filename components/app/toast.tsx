"use client";

import { cn } from "cn";
import { useEffect, useSyncExternalStore } from "react";

import { IconButton } from "@/components/ui/button";

/**
 * Toast do design: um por vez, card com ícone do tipo, mensagem, nota opcional,
 * botão de fechar e barra de tempo restante.
 */
export type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  /** Texto secundário abaixo da mensagem. */
  note?: string;
  type?: ToastType;
}

interface ToastState {
  id: number;
  ms: number;
  msg: string;
  note: string;
  type: ToastType;
}

const PENDING_NOTE =
  "Seus dados foram salvos, mas o cadastro ainda não está completo: confirme seu e-mail.";

let current: ToastState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
/** Atualizado pelo <Toaster>: e-mail da conta ainda não confirmado. */
let pendingVerification = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function duration(type: ToastType, note: string) {
  if (type === "error") {
    return 6000;
  }
  return note ? 4800 : 3000;
}

export function toast(msg: string, options: ToastOptions = {}) {
  clearTimeout(timer);
  const type = options.type ?? "success";
  const note =
    options.note ??
    (type === "success" && pendingVerification ? PENDING_NOTE : "");
  const ms = duration(type, note);
  // Novo id reinicia a animação e a barra mesmo com a mesma mensagem.
  current = { id: (current?.id ?? 0) + 1, msg, note, type, ms };
  emit();
  timer = setTimeout(dismissToast, ms);
}

export function dismissToast() {
  clearTimeout(timer);
  current = null;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Há um toast visível (os botões flutuantes não se escondem enquanto isso). */
export function useToastVisible() {
  return useSyncExternalStore(
    subscribe,
    () => current !== null,
    () => false
  );
}

/** Ícone e cor de cada tipo (`--toast-*` em app/styles/tokens/colors.css). */
const TYPES: Record<
  ToastType,
  { icon: string; fg: string; tint: string; bar: string }
> = {
  success: {
    icon: "✓",
    fg: "text-toast-success",
    tint: "bg-toast-success/14",
    bar: "bg-toast-success",
  },
  error: {
    icon: "!",
    fg: "text-toast-error",
    tint: "bg-toast-error/14",
    bar: "bg-toast-error",
  },
  warning: {
    icon: "!",
    fg: "text-toast-warning",
    tint: "bg-toast-warning-tint/20",
    bar: "bg-toast-warning",
  },
  info: {
    icon: "i",
    fg: "text-toast-info",
    tint: "bg-toast-info/14",
    bar: "bg-toast-info",
  },
};

function ToastCard({ t }: { t: ToastState }) {
  const s = TYPES[t.type];
  return (
    <div
      className={cn(
        "fixed z-50 flex animate-acv-toast-in items-start gap-3 overflow-hidden rounded-xl border border-line bg-card py-3.5 pr-3 pb-4 pl-3.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,.14),0_2px_6px_rgba(0,0,0,.06)]",
        // Desktop: centralizado. --tx é o deslocamento horizontal, usado também pela animação
        // (que define `transform`; por isso não usar os utilitários translate-*).
        "bottom-7 left-1/2 w-[min(440px,calc(100vw-40px))] [--tx:-50%] [transform:translateX(var(--tx))]",
        // Até 640px: à esquerda da coluna de botões flutuantes.
        "max-[640px]:right-[88px] max-[640px]:bottom-4 max-[640px]:left-4 max-[640px]:w-auto max-[640px]:[--tx:0px]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 flex-none items-center justify-center rounded-full font-bold text-sm leading-none",
          s.fg,
          s.tint
        )}
      >
        {s.icon}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="text-pretty font-semibold text-sm leading-5">
          {t.msg}
        </div>
        {t.note ? (
          <div className="mt-0.5 text-pretty text-[13px] text-mute leading-[18px]">
            {t.note}
          </div>
        ) : null}
      </div>
      <IconButton
        aria-label="Fechar notificação"
        className="size-7 rounded-lg text-sm"
        onClick={dismissToast}
        title="Fechar"
      >
        ✕
      </IconButton>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-[3px] origin-left opacity-55",
          s.bar
        )}
        style={{ animation: `acv-toast-bar ${t.ms}ms linear both` }}
      />
    </div>
  );
}

export function Toaster({
  pendingVerification: pending,
}: {
  pendingVerification: boolean;
}) {
  useEffect(() => {
    pendingVerification = pending;
  }, [pending]);
  const t = useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
  // As regiões vivas ficam sempre montadas: leitores de tela costumam ignorar regiões
  // que já nascem com conteúdo. Erros vão para a região `alert`.
  return (
    <>
      <div aria-atomic="true" aria-live="polite" role="status">
        {t && t.type !== "error" ? <ToastCard key={t.id} t={t} /> : null}
      </div>
      <div aria-atomic="true" role="alert">
        {t && t.type === "error" ? <ToastCard key={t.id} t={t} /> : null}
      </div>
    </>
  );
}
