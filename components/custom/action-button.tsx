import { cn } from "cn";
import type * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Botão de ação compacto do Painel ("Terminei", "Ler", "Devolver"): contorno neutro
 * que passa para o acento (borda e texto) no hover e no foco, em 200 ms.
 */
export function ActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-8 flex-none duration-200 hover:border-acc hover:text-acc focus-visible:border-acc focus-visible:text-acc",
        className
      )}
      size="xs"
      variant="neutral"
      {...props}
    />
  );
}
