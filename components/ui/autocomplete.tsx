"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react";
import { cn } from "cn";

import { ChevronDownIcon, comboboxItemClass } from "@/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/*
 * Autocomplete do Base UI no visual do combobox: campo de texto livre com sugestões.
 * Popup, lista e estado vazio são as mesmas partes do Combobox no Base UI, então
 * reaproveitam ComboboxContent/List/Empty (inclusive o `container` do portal para
 * uso dentro de um Dialog modal do Radix). Só o grupo, a seta e o item são próprios.
 */

const Autocomplete = AutocompletePrimitive.Root;

function AutocompleteInput({
  className,
  disabled = false,
  ...props
}: Omit<AutocompletePrimitive.Input.Props, "className"> & {
  /** Classe do grupo (borda e fundo); o input ocupa o espaço restante. */
  className?: string;
}) {
  return (
    // Como Autocomplete.InputGroup, o grupo inteiro (com a seta) é a âncora da lista.
    <AutocompletePrimitive.InputGroup
      render={<InputGroup className={className} />}
    >
      <AutocompletePrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          asChild
          className="data-pressed:bg-transparent"
          disabled={disabled}
          size="icon-xs"
        >
          <AutocompletePrimitive.Trigger aria-label="Mostrar sugestões">
            <ChevronDownIcon className="pointer-events-none size-4 text-mute" />
          </AutocompletePrimitive.Trigger>
        </InputGroupButton>
      </InputGroupAddon>
    </AutocompletePrimitive.InputGroup>
  );
}

function AutocompleteItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      className={cn(comboboxItemClass, className)}
      data-slot="autocomplete-item"
      {...props}
    />
  );
}

export {
  ComboboxContent as AutocompleteContent,
  ComboboxEmpty as AutocompleteEmpty,
  ComboboxList as AutocompleteList,
} from "@/components/ui/combobox";
export { Autocomplete, AutocompleteInput, AutocompleteItem };
