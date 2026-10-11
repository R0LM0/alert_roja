"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Nombre accesible del control (el thumb lo anuncia). */
  "aria-label": string;
  /** Texto que anuncian los lectores de pantalla, p. ej. "35 por ciento". */
  valueText?: string;
};

export function Slider({ className, "aria-label": ariaLabel, valueText, ...props }: SliderProps) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-11 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={ariaLabel}
          aria-valuetext={valueText}
          className="block size-11 rounded-full border-4 border-foreground bg-primary shadow-soft transition-transform active:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
