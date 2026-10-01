import { cn } from "cn";

/** Marca de três lombadas (tinta, contorno e terracota). */
export function BrandMark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  const s =
    size === "lg"
      ? { box: "h-8", bar: "w-2", a: "h-6", b: "h-5", c: "h-8" }
      : { box: "h-[26px]", bar: "w-1.5", a: "h-[22px]", b: "h-[18px]", c: "h-[26px]" };
  return (
    <span aria-hidden="true" className={cn("flex items-end gap-0.5", s.box, className)}>
      <span className={cn(s.bar, s.a, "rounded-[2px] bg-ink")} />
      <span className={cn(s.bar, s.b, "rounded-[2px] border-[1.5px] border-ink")} />
      <span className={cn(s.bar, s.c, "rounded-[2px] bg-acc")} />
    </span>
  );
}
