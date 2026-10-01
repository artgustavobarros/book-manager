import { cn } from "cn";

import { coverColors, coverImage } from "@/lib/domain/cover";
import { initial } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

/**
 * Mini-capa (inicial sobre a cor gerada + imagem por cima), usada no Painel, na lista
 * e nos resultados. `as="button"` para as que abrem a ficha.
 */
export function MiniCover({
  book,
  className,
  as = "span",
  onClick,
  title,
}: {
  book: Pick<Book, "title" | "author" | "coverUrl">;
  className?: string;
  as?: "span" | "button";
  onClick?: () => void;
  title?: string;
}) {
  const { coverBg, coverInk } = coverColors(book.title, book.author);
  const Comp = as;
  return (
    <Comp
      {...(as === "button" ? { type: "button" as const, onClick } : {})}
      title={title}
      style={{ background: coverBg, color: coverInk }}
      className={cn(
        "relative flex flex-none items-center justify-center overflow-hidden border-0 p-0 font-bold",
        as === "button" && "cursor-pointer",
        className,
      )}
    >
      {initial(book.title)}
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: coverImage(book.coverUrl) }}
      />
    </Comp>
  );
}
