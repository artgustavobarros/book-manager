"use client";

import { cn } from "cn";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { useCoverImage } from "@/hooks/use-cover-image";
import { coverColors, coverSrc } from "@/lib/domain/cover";
import { initial } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

/**
 * Mini-capa (inicial sobre a cor gerada + imagem com skeleton durante o fetch),
 * usada no Painel, na lista e nos resultados. `as="button"` para as que abrem a ficha.
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
  const src = book.coverUrl ? coverSrc(book.coverUrl) : null;
  const { imgRef, loaded, showImage, onLoad, onError } = useCoverImage(src);
  const Comp = as;

  return (
    <Comp
      {...(as === "button"
        ? {
            type: "button" as const,
            onClick,
            "aria-label": title ?? book.title,
          }
        : {})}
      className={cn(
        "relative flex flex-none items-center justify-center overflow-hidden border-0 p-0 font-bold",
        as === "button" && "cursor-pointer",
        className
      )}
      style={{ background: coverBg, color: coverInk }}
      title={title}
    >
      {initial(book.title)}
      {showImage ? (
        <>
          <Image
            alt=""
            aria-hidden="true"
            className={cn(
              "object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
            fill
            onError={onError}
            onLoad={onLoad}
            ref={imgRef}
            sizes="56px"
            src={src!}
            unoptimized
          />
          {loaded ? null : (
            <Skeleton className="absolute inset-0 size-full rounded-none" />
          )}
        </>
      ) : null}
    </Comp>
  );
}
