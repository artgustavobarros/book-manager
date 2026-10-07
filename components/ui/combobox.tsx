"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { cn } from "cn";
import type * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/*
 * Combobox do shadcn (estilo radix-nova, sobre o Base UI), com três ajustes locais:
 * - ícones em SVG inline em vez de lucide-react (o app não usa a biblioteca);
 * - `container` no ComboboxContent: dentro de um Dialog modal do Radix, o popup
 *   precisa ficar no conteúdo do diálogo, senão o Radix bloqueia clique, rolagem e foco;
 * - o grupo é o Combobox.InputGroup, para a lista ter a largura do campo inteiro;
 * - só as partes usadas (sem chips, grupos e clear), no visual do Design System.
 */

function ChevronDownIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const Combobox = ComboboxPrimitive.Root;

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      data-slot="combobox-trigger"
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-mute" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "className"> & {
  /** Classe do grupo (borda e fundo); o input ocupa o espaço restante. */
  className?: string;
  showTrigger?: boolean;
}) {
  return (
    // Como Combobox.InputGroup, o grupo inteiro (com a seta) é a âncora da lista.
    <ComboboxPrimitive.InputGroup render={<InputGroup className={className} />}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      {showTrigger ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            asChild
            className="data-pressed:bg-transparent"
            disabled={disabled}
            size="icon-xs"
          >
            <ComboboxTrigger />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
      {children}
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  container,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  > &
  Pick<ComboboxPrimitive.Portal.Props, "container">) {
  return (
    <ComboboxPrimitive.Portal container={container}>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          className={cn(
            "group/combobox-content data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg border border-line2 bg-card text-ink shadow-popover duration-100 data-closed:animate-out data-open:animate-in",
            className
          )}
          data-slot="combobox-content"
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      className={cn(
        "max-h-[min(--spacing(72),calc(var(--available-height)---spacing(2)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className
      )}
      data-slot="combobox-list"
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md py-2 pr-8 pl-2.5 text-ink text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-hov data-disabled:opacity-50",
        className
      )}
      data-slot="combobox-item"
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      className={cn(
        "hidden w-full justify-center py-3 text-center text-mute text-sm group-data-empty/combobox-content:flex",
        className
      )}
      data-slot="combobox-empty"
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
};
