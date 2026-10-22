import { CheckIcon, PlayIcon, RotateCcwIcon } from "lucide-react";

import type { Reading } from "@/lib/domain/types";

/** Rótulo da ação rápida da Leitura (`cycleReading`) para a Leitura atual. */
export function readingActionLabel(reading: Reading) {
  if (reading === "lido") {
    return "Marcar como não lido";
  }
  return reading === "lendo" ? "Concluir leitura" : "Começar a ler";
}

/** Ícone da ação rápida da Leitura: ↺ desfaz o lido, ✓ conclui, ▶ começa. */
export function ReadingActionIcon({
  reading,
  className,
}: {
  reading: Reading;
  className?: string;
}) {
  const Icon =
    reading === "lido"
      ? RotateCcwIcon
      : reading === "lendo"
        ? CheckIcon
        : PlayIcon;
  return <Icon aria-hidden="true" className={className} />;
}
