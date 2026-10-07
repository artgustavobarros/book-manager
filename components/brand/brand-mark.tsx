import { cn } from "cn";

/**
 * Marca da Bodega: dois livros deitados (tinta), garrafa bordô com gargalo e rótulo,
 * sobre uma linha de base. `lg` (entrada): 36px de altura · `header`: 30px.
 */
export function BrandMark({
  size = "header",
  className,
}: {
  size?: "header" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex flex-none items-end gap-[3px] px-px pb-[3px]",
        lg ? "h-9" : "h-[30px]",
        className
      )}
    >
      <span className="flex flex-col items-start gap-px">
        <span className="h-[5px] w-[15px] rounded-[1px] bg-ink" />
        <span className="h-1.5 w-[18px] rounded-[1px] bg-ink" />
      </span>
      <span
        className={cn(
          "relative w-[9px] rounded-[4px_4px_1px_1px] bg-acc",
          lg ? "h-[26px]" : "h-5"
        )}
      >
        <span className="absolute -top-1.5 left-[3px] h-[7px] w-[3px] rounded-[1px_1px_0_0] bg-acc" />
        <span
          className={cn(
            "absolute inset-x-[2px] h-[5px] rounded-[1px] bg-card",
            lg ? "top-2.5" : "top-2"
          )}
        />
      </span>
      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-[1px] bg-ink" />
    </span>
  );
}

/** Nome em duas linhas: "Bodega" (Fraunces 700) e "Literária" (Fraunces itálico 500, bordô). */
export function BrandWordmark({
  size = "header",
  className,
}: {
  size?: "header" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-col whitespace-nowrap text-left font-title",
        size === "lg" ? "text-2xl leading-[23px]" : "text-lg leading-[17px]",
        className
      )}
    >
      <span className="font-bold text-ink">Bodega</span>
      <span className="font-medium text-acc italic">Literária</span>
    </span>
  );
}
