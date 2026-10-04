"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";

import { Button } from "./button";

/**
 * Confirmação no estilo do app (substitui `window.confirm`): cartão do modal do
 * Design System com título, texto e as ações Cancelar / confirmar.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onReturnFocus,
  onConfirm,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onReturnFocus?: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 flex animate-acv-fade items-start justify-center overflow-y-auto bg-black/45 px-5 py-20">
          <AlertDialogPrimitive.Content
            className="flex w-full max-w-[440px] animate-acv-rise flex-col gap-4 rounded-xl bg-card px-6 py-6 text-ink shadow-modal outline-none"
            onCloseAutoFocus={
              onReturnFocus
                ? (event) => {
                    event.preventDefault();
                    onReturnFocus();
                  }
                : undefined
            }
          >
            <AlertDialogPrimitive.Title className="m-0 font-bold text-xl">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="m-0 text-mute text-sm leading-[1.5]">
              {description}
            </AlertDialogPrimitive.Description>
            <div className="flex justify-end gap-2">
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="neutral">{cancelLabel}</Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  className={destructive ? "bg-acc hover:bg-ink" : undefined}
                  onClick={onConfirm}
                  variant="primary"
                >
                  {confirmLabel}
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Overlay>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
