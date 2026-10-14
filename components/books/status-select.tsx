"use client";

import { cn } from "cn";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { STATUS, stat } from "@/lib/domain/status";
import type { BookStatus } from "@/lib/domain/types";

const STATUS_ITEMS = STATUS.map((s) => ({ value: s.k, label: s.label }));

/**
 * Seletor de status abaixo do livro: Select do Base UI em pílula, com o ponto da cor do
 * status; fundo = cor do status a 16% sobre o card. O wrapper segura o clique (inclusive
 * o que sobe do popup no portal) para não abrir a ficha.
 */
export function StatusSelect({
  value,
  onChange,
  className,
  selectClassName,
}: {
  value: BookStatus;
  onChange: (k: BookStatus) => void;
  className?: string;
  selectClassName?: string;
}) {
  const dot = stat(value).dot;
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
        items={STATUS_ITEMS}
        onValueChange={(k) => {
          if (k) {
            onChange(k);
          }
        }}
        value={value}
      >
        <SelectTrigger
          aria-label="Status"
          className={cn(
            "h-7 w-auto max-w-full rounded-full border-transparent pr-2 pl-6 font-semibold text-xs hover:border-line2 max-[640px]:min-h-11 [&_svg]:size-3.5",
            selectClassName
          )}
          style={{ background: `color-mix(in oklch, ${dot} 16%, var(--card))` }}
        />
        <SelectContent>
          {STATUS.map((s) => (
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
