import { cn } from "cn";

/**
 * Bloco de skeleton na paleta da Bodega (papel/rolha: `--soft` / `--row`),
 * com pulso suave que respeita `prefers-reduced-motion`.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-pulse rounded-md bg-soft/90 dark:bg-soft",
        className
      )}
      data-slot="skeleton"
      {...props}
    />
  );
}
