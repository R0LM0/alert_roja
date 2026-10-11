"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
};

export function Progress({ className, indicatorClassName, value = 0, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn("relative h-3 w-full overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full bg-primary transition-[width] duration-300", indicatorClassName)}
        style={{ width: `${value ?? 0}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
