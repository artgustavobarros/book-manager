import { CheckIcon, PlayIcon, RotateCcwIcon } from "lucide-react";

import type { BookStatus } from "@/lib/domain/types";

/** Rótulo da ação rápida de status (`cycleStatus`) para o status atual. */
export function statusActionLabel(status: BookStatus) {
  if (status === "lido") {
    return "Marcar como não lido";
  }
  return status === "lendo" ? "Concluir leitura" : "Começar a ler";
}

/** Ícone da ação rápida de status: ↺ desfaz o lido, ✓ conclui, ▶ começa. */
export function StatusActionIcon({
  status,
  className,
}: {
  status: BookStatus;
  className?: string;
}) {
  const Icon =
    status === "lido"
      ? RotateCcwIcon
      : status === "lendo"
        ? CheckIcon
        : PlayIcon;
  return <Icon aria-hidden="true" className={className} />;
}
