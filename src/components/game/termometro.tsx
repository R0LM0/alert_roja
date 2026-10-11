"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type TermometroProps = {
  /** Porcentaje 0–100. */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

/** Control tipo termómetro: número grande + slider accesible (teclado: flechas, Re Pág, Inicio, Fin). */
export function Termometro({ value, onChange, disabled, className }: TermometroProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p className="font-display text-7xl leading-none font-bold tabular-nums" aria-hidden="true">
        {value}
        <span className="text-4xl text-muted"> %</span>
      </p>
      <p className="text-sm text-muted">¿Qué tan probable es que esté infectado?</p>
      <Slider
        aria-label="Probabilidad de estar infectado, en porcentaje"
        valueText={`${value} por ciento`}
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
      />
      <div className="flex w-full justify-between text-sm text-muted" aria-hidden="true">
        <span>0 %</span>
        <span>100 %</span>
      </div>
    </div>
  );
}
