"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/card";
import { tiempoRelativo, type EntradaActividad } from "@/lib/panel";
import { useAhora } from "./useAnimacionesPanel";

type Props = { actividad: EntradaActividad[] | undefined };

/**
 * Feed "Acaban de jugar": las últimas partidas. En pantalla grande es una tira horizontal
 * (la más nueva a la izquierda); en móvil, una lista corta. Cada entrada nueva desliza
 * y el resto se reacomoda con `layout`.
 */
export function ActividadReciente({ actividad }: Props) {
  const reducido = useReducedMotion();
  const ahora = useAhora();

  return (
    <Card className="flex min-h-0 flex-col gap-3 p-4 sm:p-6 2xl:flex-row 2xl:items-center 2xl:gap-6 2xl:px-6 2xl:py-4">
      <h2 className="shrink-0 font-display text-xl font-bold sm:text-3xl">Acaban de jugar</h2>
      {actividad === undefined ? (
        <p className="text-lg text-muted sm:text-2xl">Cargando…</p>
      ) : actividad.length === 0 ? (
        <p className="text-lg text-muted sm:text-2xl">Aún no hay partidas.</p>
      ) : (
        <ul className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden sm:flex-row sm:gap-3 [&>li:nth-child(n+5)]:hidden sm:[&>li:nth-child(n+5)]:flex">
          <AnimatePresence initial={false}>
            {actividad.map((e) => (
              <motion.li
                key={e.id}
                layout={!reducido}
                initial={reducido ? false : { opacity: 0, x: 64 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex min-w-0 shrink-0 flex-col gap-0.5 rounded-lg bg-surface-2 px-3 py-2 sm:min-w-0 sm:flex-1 2xl:px-4 2xl:py-2.5"
              >
                <span className="truncate text-lg leading-tight font-semibold 2xl:text-2xl" title={e.jugador}>
                  {e.jugador}
                </span>
                <span className="flex items-baseline gap-2 text-base text-muted tabular-nums 2xl:text-lg">
                  <span className="font-display font-bold text-foreground">
                    {e.puntaje}
                    <span className="sr-only"> puntos</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={e.creada_en} className="whitespace-nowrap">
                    {tiempoRelativo(e.creada_en, ahora)}
                  </time>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}
