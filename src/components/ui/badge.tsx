import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold [&_svg]:size-4",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-foreground",
        danger: "bg-primary text-primary-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        info: "border border-info text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
