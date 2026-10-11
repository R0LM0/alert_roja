import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover",
        success: "bg-success text-success-foreground shadow-soft hover:brightness-110",
        warning: "bg-warning text-warning-foreground shadow-soft hover:brightness-110",
        ghost: "bg-transparent text-foreground hover:bg-ghost-hover",
        outline: "border-2 border-border-strong bg-transparent text-foreground hover:bg-ghost-hover",
      },
      size: {
        md: "min-h-11 px-4 text-base",
        lg: "min-h-12 px-6 text-lg",
        xl: "min-h-16 px-8 font-display text-2xl",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
