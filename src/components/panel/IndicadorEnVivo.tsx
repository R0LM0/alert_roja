"use client";

import { cn } from "@/lib/utils";
import { useAhora } from "./useAnimacionesPanel";

type Props = {
  /** Momento (ms) de la última respuesta correcta del servidor. */
  ultimaActualizacion: number | undefined;
  /** Hay un fallo de red o de servidor: se muestra "reconectando…" y los datos previos quedan visibles. */
  error: boolean;
};

/** Indicador "EN VIVO" con punto pulsante y segundos desde la última actualización. */
export function IndicadorEnVivo({ ultimaActualizacion, error }: Props) {
  const ahora = useAhora();
  const seg = ultimaActualizacion === undefined ? null : Math.max(0, Math.floor((ahora - ultimaActualizacion) / 1000));

  return (
    <div className="pastilla-en-vivo flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-base font-semibold sm:text-xl">
      <span className="relative flex size-3 shrink-0" aria-hidden="true">
        {error ? null : (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-3 rounded-full", error ? "bg-warning" : "bg-primary")} />
      </span>
      {error ? (
        <span role="status" className="text-warning">
          reconectando…
        </span>
      ) : (
        <>
          <span className="texto-en-vivo font-display font-bold tracking-wide">EN VIVO</span>
          <span className="text-muted tabular-nums">
            {seg === null ? "conectando…" : `actualizado hace ${seg} s`}
          </span>
        </>
      )}
    </div>
  );
}
