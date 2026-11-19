"use client";

import { cn } from "cn";

import { coverColors, coverImage } from "@/lib/domain/cover";
import type { LookupResult } from "@/lib/domain/lookup";

export function formatLookupMeta(
  item: LookupResult,
  includeSource = true
): string {
  return [
    item.publisher,
    item.genre,
    item.year,
    item.pages ? `${item.pages} p.` : "",
    includeSource ? item.source : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function BookLookupOption({
  item,
  onSelect,
  variant = "inline",
}: {
  item: LookupResult;
  onSelect: (item: LookupResult) => void;
  variant?: "inline" | "card";
}) {
  const isCard = variant === "card";
  const { coverBg } = coverColors(item.title, item.author);
  const meta = formatLookupMeta(item, !isCard);

  return (
    <button
      className={cn(
        "flex items-center gap-3 text-left text-ink transition-[border-color,background-color,transform] duration-150",
        isCard
          ? "group rounded-xl border border-line bg-card p-3 hover:border-acc hover:bg-hov active:scale-[0.99]"
          : "rounded-lg border-0 bg-transparent p-2 hover:bg-card"
      )}
      onClick={() => onSelect(item)}
      type="button"
    >
      <span
        className={cn(
          "relative flex-none overflow-hidden shadow-xs",
          isCard ? "h-20 w-14 rounded-md" : "h-12 w-8 rounded bg-soft"
        )}
        style={isCard ? { background: coverBg } : undefined}
      >
        {item.cover ? (
          <span
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: coverImage(item.cover) }}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "font-semibold text-ink text-sm",
            isCard ? "line-clamp-2 leading-snug" : "truncate"
          )}
        >
          {item.title}
        </span>
        <span className="truncate text-mute text-xs">
          {item.author || (isCard ? "Autor não informado" : "—")}
        </span>
        {meta ? (
          <span className="line-clamp-1 text-mute text-xs">{meta}</span>
        ) : null}
        {isCard ? (
          <span className="mt-0.5 self-start rounded-full bg-soft px-2 py-0.5 font-medium text-mute text-xs">
            {item.source}
          </span>
        ) : null}
      </span>
      {isCard ? (
        <span className="shrink-0 rounded-lg bg-soft px-2.5 py-1.5 font-semibold text-ink text-xs transition-colors group-hover:bg-acc group-hover:text-onacc">
          Selecionar
        </span>
      ) : null}
    </button>
  );
}
