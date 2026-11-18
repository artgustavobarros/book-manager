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
  htmlFor,
}: {
  label: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const rootClassName = cn(
    "flex flex-col gap-2 font-medium text-mute text-xs",
    className
  );
  const content = (
    <>
      {htmlFor ? (
        <label htmlFor={htmlFor}>{label}</label>
      ) : (
        <span>{label}</span>
      )}
      {children}
      {error ? (
        <span className="font-normal text-acc text-xs" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );

  return htmlFor ? (
    <div className={rootClassName}>{content}</div>
  ) : (
    <label className={rootClassName}>{content}</label>
  );
}
