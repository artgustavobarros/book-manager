import { cn } from "cn";
import type * as React from "react";

/** Campo do Design System: borda line2, foco tinta + anel de 3px, erro em terracota. */
export const fieldClass =
  "w-full min-w-0 rounded-lg border border-line2 bg-card px-3 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink focus:shadow-ring aria-invalid:border-acc aria-invalid:focus:shadow-none disabled:cursor-not-allowed disabled:bg-soft disabled:text-mute";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(fieldClass, "h-10", className)}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
