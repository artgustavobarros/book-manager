import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import type * as React from "react";

/**
 * Botões do Design System (seção "Botões"):
 * primário (bordô → bordô-escuro), contorno (inverte no hover), neutro (borda → tinta),
 * ghost e link. Pressão encolhe para 97%; desabilitado 60%; formulário incompleto 40%
 * (use `aria-disabled`).
 */
const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-[background-color,color,border-color,transform,box-shadow] duration-150 focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-default aria-disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "border-0 bg-acc text-onacc hover:bg-acc2 active:scale-[.97] aria-disabled:hover:bg-acc",
        outline:
          "border border-ink bg-transparent text-ink hover:bg-ink hover:text-card active:scale-[.97]",
        neutral:
          "border border-line2 bg-card text-ink hover:border-ink active:scale-[.97]",
        ghost: "border-0 bg-transparent text-mute hover:bg-hov hover:text-ink",
        danger: "border-0 bg-transparent text-acc hover:bg-hov",
        link: "h-auto border-0 bg-transparent p-0 text-ink hover:text-acc",
      },
      size: {
        default: "h-10 rounded-lg px-4 text-sm",
        sm: "h-9 rounded-lg px-3 text-sm",
        xs: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-4 text-sm",
        none: "",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "default" },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot="button"
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

type IconButtonProps = React.ComponentProps<"button"> & {
  "aria-label": string;
};

function IconButton({
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-0 bg-transparent text-mute transition-colors duration-200 hover:bg-acc/10 hover:text-acc focus-visible:shadow-ring [&>span]:inline-block [&>span]:transition-transform [&>span]:duration-200 hover:[&>span]:scale-110",
        className
      )}
      type={type}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export { Button, buttonVariants, IconButton };
