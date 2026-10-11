"use client";

import { cn } from "@/lib/utils";
import type { ModoPanel } from "./usePanelDatos";

const OPCIONES: { modo: ModoPanel; texto: string }[] = [
  { modo: "normal", texto: "Normal (10 %)" },
  { modo: "experto", texto: "Experto (1 %)" },
];

type Props = { modo: ModoPanel; onCambiar: (m: ModoPanel) => void };

/** Grupo de botones con aria-pressed; el activo se distingue por relleno y marca, no solo por color. */
export function FiltroPrevalencia({ modo, onCambiar }: Props) {
  return (
    <div role="group" aria-label="Prevalencia" className="flex w-full gap-1.5 rounded-xl border border-border bg-surface p-1 sm:w-auto sm:gap-2 sm:p-1.5">
      {OPCIONES.map(({ modo: m, texto }) => {
        const activo = m === modo;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(m)}
            className={cn(
              "touch-target min-h-11 flex-1 rounded-lg px-3 text-base font-semibold whitespace-nowrap transition-colors sm:min-h-14 sm:flex-none sm:px-5 sm:text-xl 2xl:px-7 2xl:text-2xl",
              activo ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-ghost-hover",
            )}
          >
            {activo ? <span aria-hidden="true">● </span> : null}
            {texto}
          </button>
        );
      })}
    </div>
  );
}
