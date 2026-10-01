import { cn } from "cn";

/**
 * Marca de três lombadas (tinta, contorno e terracota).
 * `header`: 8px de largura, 24/20/28 de altura · `lg` (entrada): 24/20/32.
 */
export function BrandMark({ size = "header", className }: { size?: "header" | "lg"; className?: string }) {
  const tall = size === "lg" ? "h-8" : "h-7";
  return (
    <span aria-hidden="true" className={cn("flex items-end gap-0.5", tall, className)}>
      <span className="h-6 w-2 rounded-[2px] bg-ink" />
      <span className="h-5 w-2 rounded-[2px] border-[1.5px] border-ink" />
      <span className={cn("w-2 rounded-[2px] bg-acc", tall)} />
    </span>
  );
}
