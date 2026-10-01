"use client";

import { cn } from "cn";

import { STATUS, stat } from "@/lib/domain/status";
import type { BookStatus } from "@/lib/domain/types";

/**
 * Seletor de status do design: <select> nativo em pílula, com o ponto da cor do status
 * e uma seta discreta; fundo = cor do status a 16% sobre o card.
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
    <span onClick={(e) => e.stopPropagation()} className={cn("relative flex items-center", className)}>
      <span className="pointer-events-none absolute left-3 size-2 rounded-full" style={{ background: dot }} />
      <span className="pointer-events-none absolute top-2 right-3 size-1 rotate-45 border-r-[1.5px] border-b-[1.5px] border-ink opacity-55" />
      <select
        aria-label="Status"
        value={value}
        onChange={(e) => onChange(e.target.value as BookStatus)}
        style={{ background: `color-mix(in oklch, ${dot} 16%, var(--card))` }}
        className={cn(
          "h-7 cursor-pointer appearance-none rounded-full border border-transparent pr-7 pl-6 text-xs font-semibold text-ink outline-none transition-[border-color,background-color] duration-150 hover:border-line2 focus:border-ink",
          selectClassName,
        )}
      >
        {STATUS.map((s) => (
          <option key={s.k} value={s.k}>
            {s.label}
          </option>
        ))}
      </select>
    </span>
  );
}
