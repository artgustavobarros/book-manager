"use client";

import { cn } from "cn";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { READINGS, readingInfo } from "@/lib/domain/book-state";
import type { Reading } from "@/lib/domain/types";

const READING_ITEMS = READINGS.map((s) => ({ value: s.k, label: s.label }));

/**
 * Seletor de Leitura abaixo do livro: Select do Base UI em pílula, com o ponto da cor da
 * Leitura; fundo = cor da Leitura a 16% sobre o card. O wrapper segura o clique (inclusive
 * o que sobe do popup no portal) para não abrir a ficha.
 */
export function ReadingSelect({
  value,
  onChange,
  className,
  selectClassName,
}: {
  value: Reading;
  onChange: (k: Reading) => void;
  className?: string;
  selectClassName?: string;
}) {
  const dot = readingInfo(value).dot;
  return (
    <span
      className={cn("relative flex max-w-full items-center", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="pointer-events-none absolute left-3 z-[1] size-2 rounded-full"
        style={{ background: dot }}
      />
      <Select
        items={READING_ITEMS}
        onValueChange={(k) => {
          if (k) {
            onChange(k);
          }
        }}
        value={value}
      >
        <SelectTrigger
          aria-label="Leitura"
          className={cn(
            "h-7 w-auto max-w-full rounded-full border-transparent pr-2 pl-6 font-semibold text-xs hover:border-line2 max-[640px]:min-h-11 [&_svg]:size-3.5",
            selectClassName
          )}
          style={{ background: `color-mix(in oklch, ${dot} 16%, var(--card))` }}
        />
        <SelectContent>
          {READINGS.map((s) => (
            <SelectItem key={s.k} value={s.k}>
              <span className="flex items-center gap-2">
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ background: s.dot }}
                />
                {s.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
