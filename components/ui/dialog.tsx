"use client";

import { cn } from "cn";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import * as React from "react";
import { ConfirmDialog } from "./alert-dialog";
import { IconButton } from "./button";

type DraftContextValue = {
  register: (key: symbol, dirty: boolean) => void;
  requestClose: () => void;
};
const DraftContext = React.createContext<DraftContextValue | null>(null);

/** Registra cada seção alterada no modal para confirmar o descarte uma única vez. */
export function useModalDraft(dirty: boolean) {
  const ctx = React.useContext(DraftContext);
  const draftKey = React.useMemo(() => Symbol("draft"), []);
  React.useEffect(() => {
    ctx?.register(draftKey, dirty);
    return () => ctx?.register(draftKey, false);
  }, [ctx, dirty, draftKey]);
}

export function useModalClose() {
  return React.useContext(DraftContext)?.requestClose;
}

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
  guardChanges = false,
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
  guardChanges?: boolean;
  children: React.ReactNode;
}) {
  const dirtyKeys = React.useRef<Set<symbol> | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const pendingInput = React.useRef(false);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const pendingTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const markInput = () => {
    pendingInput.current = true;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      pendingInput.current = false;
    }, 500);
  };
  React.useEffect(() => () => clearTimeout(pendingTimer.current), []);
  const register = React.useCallback((key: symbol, isDirty: boolean) => {
    dirtyKeys.current ??= new Set();
    if (isDirty) {
      dirtyKeys.current.add(key);
    } else {
      dirtyKeys.current.delete(key);
    }
  }, []);
  const requestClose = React.useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if ((dirtyKeys.current?.size ?? 0) > 0 || pendingInput.current) {
      setConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [onOpenChange]);
  const draftContext = React.useMemo(
    () => ({ register, requestClose }),
    [register, requestClose]
  );
  React.useEffect(() => {
    if (!(open && guardChanges)) {
      return;
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ((dirtyKeys.current?.size ?? 0) > 0 || pendingInput.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [open, guardChanges]);
  return (
    <DraftContext.Provider value={draftContext}>
      <DialogPrimitive.Root
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
          } else {
            requestClose();
          }
        }}
        open={open}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-30 flex animate-acv-fade items-start justify-center overflow-y-auto bg-black/45 px-5 py-10 max-[640px]:p-2",
              veilClassName
            )}
            data-slot="modal-veil"
          >
            <DialogPrimitive.Content
              className={cn(
                "w-full animate-acv-rise overflow-hidden rounded-2xl bg-card text-ink shadow-modal outline-none max-[640px]:max-h-[calc(100dvh-16px)] max-[640px]:overflow-y-auto",
                className
              )}
              data-slot="modal"
              onChangeCapture={guardChanges ? markInput : undefined}
              // O Radix trata o Esc antes de todos (captura no document): com a lista de
              // um combobox aberta, o Esc deve fechar só a lista, não o modal.
              onEscapeKeyDown={(e) => {
                const target = e.target as Element | null;
                if (
                  target?.closest?.('[role="combobox"][aria-expanded="true"]')
                ) {
                  e.preventDefault();
                }
              }}
              onInputCapture={guardChanges ? markInput : undefined}
              // Foca o próprio painel ao abrir (sem anel de foco num botão); Tab continua preso no modal.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                const panel = e.currentTarget as HTMLElement | null;
                const target =
                  (initialFocus &&
                    panel?.querySelector<HTMLElement>(initialFocus)) ||
                  panel;
                target?.focus({ preventScroll: true });
              }}
              tabIndex={-1}
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
      <ConfirmDialog
        cancelLabel="Continuar editando"
        confirmLabel="Descartar alterações"
        description="O que você digitou ainda não foi salvo."
        onConfirm={() => {
          setConfirmOpen(false);
          onOpenChange(false);
        }}
        onOpenChange={setConfirmOpen}
        onReturnFocus={() => {
          if (returnFocus.current?.isConnected) {
            returnFocus.current.focus();
          }
        }}
        open={confirmOpen}
        title="Descartar alterações?"
      />
    </DraftContext.Provider>
  );
}

/** Botão ✕ de fechar (32px, ghost) usado no canto dos modais. */
function ModalClose({
  className,
  label = "Fechar",
}: {
  className?: string;
  label?: string;
}) {
  const requestClose = useModalClose();
  return (
    <IconButton
      aria-label={label}
      className={cn("size-8 rounded-lg text-base", className)}
      onClick={requestClose}
    >
      ✕
    </IconButton>
  );
}

export { Modal, ModalClose };
