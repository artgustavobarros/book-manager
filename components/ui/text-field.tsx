import { cn } from "cn";
import type * as React from "react";

/**
 * Rótulo + controle + erro, no padrão "Campos" do Design System:
 * label 12px medium mute, gap 8px, mensagem de erro 12px em terracota.
 */
export function FieldLabel({
  label,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-2 font-medium text-mute text-xs",
        className
      )}
    >
      {label}
      {children}
      {error ? (
        <span className="font-normal text-acc text-xs" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
