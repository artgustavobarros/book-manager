import { cn } from "cn";

import { coverColors, coverImage } from "@/lib/domain/cover";
import type { PublicBook } from "@/lib/domain/types";

/** Capa 2:3 (cor gerada + imagem por cima), no visual do card da Estante. */
export function PublicCover({
  book,
  size = "card",
  className,
}: {
  book: Pick<PublicBook, "title" | "author" | "coverUrl">;
  size?: "card" | "panel";
  className?: string;
}) {
  const { coverBg, coverInk } = coverColors(book.title, book.author);
  const panel = size === "panel";
  return (
    <span
      className={cn(
        "relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-md px-3 py-4",
        panel ? "shadow-lift" : "shadow-book",
        className
      )}
      style={{ background: coverBg, color: coverInk }}
    >
      <span
        className={cn(
          "break-words font-semibold uppercase tracking-[.1em] opacity-80",
          panel ? "text-[10px]" : "text-xs"
        )}
      >
        {book.author || "Autor desconhecido"}
      </span>
      <span
        className={cn(
          "text-balance break-words font-bold font-title leading-[1.08]",
          panel ? "text-lg" : "text-xl"
        )}
      >
        {book.title}
      </span>
      <span
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: coverImage(book.coverUrl) }}
      />
    </span>
  );
}
