"use client";

import { cn } from "cn";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import * as React from "react";

/**
 * Modal do design: véu preto 45% que rola (acv-fade 200ms) com o painel alinhado ao
 * topo (acv-rise 300ms). Esc e clique no véu fecham; o Radix prende e devolve o foco.
 */
function Modal({
  open,
  onOpenChange,
  title,
  description,
  className,
  veilClassName,
  initialFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título acessível (oculto visualmente; o título visível fica no conteúdo). */
  title: string;
  description?: string;
  className?: string;
  veilClassName?: string;
  /** Seletor do elemento que recebe o foco ao abrir (padrão: o próprio painel). */
  initialFocus?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="modal-veil"
          className={cn(
            "fixed inset-0 z-30 flex animate-acv-fade items-start justify-center overflow-y-auto bg-black/45 px-5 py-10",
            veilClassName,
          )}
        >
          <DialogPrimitive.Content
            data-slot="modal"
            tabIndex={-1}
            // Foca o próprio painel ao abrir (sem anel de foco num botão); Tab continua preso no modal.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const panel = e.currentTarget as HTMLElement | null;
              const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel;
              target?.focus({ preventScroll: true });
            }}
            className={cn(
              "w-full animate-acv-rise overflow-hidden rounded-2xl bg-card text-ink shadow-modal outline-none",
              className,
            )}
          >
            <VisuallyHidden.Root>
              {/* Nome acessível do diálogo; o cabeçalho visível (h2) fica no conteúdo. */}
              <DialogPrimitive.Title asChild>
                <span>{title}</span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description asChild>
                <span>{description ?? title}</span>
              </DialogPrimitive.Description>
            </VisuallyHidden.Root>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Botão ✕ de fechar (32px, ghost) usado no canto dos modais. */
function ModalClose({ className, label = "Fechar" }: { className?: string; label?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={label}
      className={cn(
        "flex size-8 flex-none items-center justify-center rounded-lg border-0 bg-transparent text-base text-mute transition-colors duration-150 hover:bg-hov hover:text-ink focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none",
        className,
      )}
    >
      ✕
    </DialogPrimitive.Close>
  );
}

export { Modal, ModalClose };
