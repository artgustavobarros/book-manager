import { cn } from "cn";

/** Item de controle segmentado: ativo vira cartão com sombra seg (Design System). */
export function segClass(active: boolean) {
  return active ? "bg-card text-ink shadow-seg" : "bg-transparent text-mute";
}

export function Segmented<K extends string | boolean>({
  options,
  value,
  onChange,
  className,
  itemClassName,
  label,
}: {
  options: readonly (readonly [K, string])[];
  value: K;
  onChange: (k: K) => void;
  className?: string;
  itemClassName?: string;
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn("flex gap-0.5 bg-seg", className)}
      role="group"
    >
      {options.map(([k, text]) => (
        <button
          aria-pressed={value === k}
          className={cn(
            "border-0 font-semibold",
            segClass(value === k),
            itemClassName
          )}
          key={String(k)}
          onClick={() => onChange(k)}
          type="button"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
