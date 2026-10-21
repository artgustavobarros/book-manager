"use client";

import { ComboboxInput, ComboboxTrigger } from "@/components/ui/combobox";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";

/**
 * Campo de combobox com a seta nomeada para leitores de tela (o `ComboboxInput` padrão
 * deixa o botão da seta sem nome acessível).
 */
export function ComboboxField({
  triggerLabel,
  ...props
}: React.ComponentProps<typeof ComboboxInput> & { triggerLabel: string }) {
  return (
    <ComboboxInput {...props} showTrigger={false}>
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          asChild
          className="data-pressed:bg-transparent"
          size="icon-xs"
        >
          <ComboboxTrigger aria-label={triggerLabel} />
        </InputGroupButton>
      </InputGroupAddon>
    </ComboboxInput>
  );
}
