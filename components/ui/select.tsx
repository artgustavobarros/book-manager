"use client";

import { Select as SelectPrimitive } from "@base-ui/react";
import { cn } from "cn";

import {
  CheckIcon,
  ChevronDownIcon,
  comboboxItemClass,
} from "@/components/ui/combobox";

/*
 * Select do Base UI no visual do combobox do app: escolha única sem campo de busca
 * (o combobox pede um texto; aqui a lista é curta e fixa). Popup e item reaproveitam
 * as classes do combobox; `container` permite usar dentro de um Dialog modal do Radix.
 */

const Select = SelectPrimitive.Root;

function SelectTrigger({
  className,
  placeholder,
  ...props
}: SelectPrimitive.Trigger.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-line2 bg-card pr-2 pl-3 text-left text-ink text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ink focus-visible:shadow-ring data-popup-open:border-ink",
        className
      )}
      data-slot="select-trigger"
      {...props}
    >
      <SelectPrimitive.Value
        className="truncate data-placeholder:text-mute"
        placeholder={placeholder}
      />
      <SelectPrimitive.Icon className="flex">
        <ChevronDownIcon className="pointer-events-none size-4 text-mute" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  container,
}: Pick<SelectPrimitive.Popup.Props, "className" | "children"> &
  Pick<SelectPrimitive.Portal.Props, "container">) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        alignItemWithTrigger={false}
        className="isolate z-50"
        sideOffset={6}
      >
        <SelectPrimitive.Popup
          className={cn(
            "data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg border border-line2 bg-card text-ink shadow-popover duration-100 data-closed:animate-out data-open:animate-in",
            className
          )}
          data-slot="select-content"
        >
          <SelectPrimitive.List className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(comboboxItemClass, "pr-8", className)}
      data-slot="select-item"
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger };
