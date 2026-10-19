"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Brain, FlaskConical, Leaf, Medal, ShieldCheck, Smile, Trophy, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { IconoInsignia } from "@/lib/insignias";
import type { EntradaRanking } from "@/lib/panel";
import { ETIQUETA_TEMPORADA_ACTUAL, formatearTiempoTotal, informacionInsignias } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Props = { ranking: EntradaRanking[] | undefined };

const COLOR_PODIO = ["text-warning", "text-foreground", "text-primary-text"] as const;
const ICONOS: Record<IconoInsignia, LucideIcon> = {
  brain: Brain, "shield-check": ShieldCheck, smile: Smile, zap: Zap, leaf: Leaf, "flask-conical": FlaskConical,
};

function ChipsInsignias({ ids }: { ids: readonly string[] }) {
  const insignias = informacionInsignias(ids);
  if (insignias.length === 0) return null;

  return (
    <ul className="flex min-w-0 flex-wrap gap-1 pt-1">
      {insignias.map((insignia) => {
        const Icono = ICONOS[insignia.icono];
        return (
          <li key={insignia.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
            <Icono aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{insignia.titulo}</span>
          </li>
        );
      })}
    </ul>
  );
}
/** Cuánto dura resaltada una fila que acaba de entrar o subir. */
const DESTACADO_MS = 2500;

function Posicion({ n }: { n: number }) {
  const Icono = n === 1 ? Trophy : n <= 3 ? Medal : null;
  return (
    <span className="flex w-14 shrink-0 items-center justify-center gap-1 font-display text-2xl sm:w-20 sm:gap-1.5 sm:text-4xl font-bold tabular-nums">
      {Icono ? <Icono aria-hidden="true" className={cn("size-5 sm:size-8", COLOR_PODIO[n - 1])} /> : null}
      <span>
        <span className="sr-only">Puesto </span>
        {n}
      </span>
    </span>
  );
}

/** Clave estable por partida (la posición cambia al reordenar; esto permite animar el movimiento). */
const claveFila = (e: EntradaRanking) => `${e.creada_en}|${e.jugador}`;

/**
 * Top 10 (primer intento por apodo): puntaje, y a igual puntaje gana el menor tiempo total. Orden de la API.
 * Las filas se reacomodan con `layout`; la que entra o sube se resalta un momento.
 */
export function RankingTop10({ ranking }: Props) {
  const reducido = useReducedMotion();
  // Posiciones de la lectura anterior; null hasta la primera carga, para no resaltar todo al abrir.
  const previo = useRef<Map<string, number> | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [destacadas, setDestacadas] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    if (ranking === undefined) return;
    const anterior = previo.current;
    previo.current = new Map(ranking.map((e, i) => [claveFila(e), i]));
    if (anterior === null) return;
    const nuevas = ranking
      .filter((e, i) => {
        const antes = anterior.get(claveFila(e));
        return antes === undefined || antes > i;
      })
      .map(claveFila);
    if (nuevas.length === 0) return;
    clearTimeout(temporizador.current);
    setDestacadas(new Set(nuevas));
    temporizador.current = setTimeout(() => setDestacadas(new Set()), DESTACADO_MS);
  }, [ranking]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
      <h2 className="font-display text-2xl sm:text-4xl font-bold">Top 10</h2>
      <p className="text-sm text-muted">{ETIQUETA_TEMPORADA_ACTUAL}</p>
      {ranking === undefined ? (
        <p className="text-lg text-muted sm:text-2xl">Cargando ranking…</p>
      ) : ranking.length === 0 ? (
        <p className="text-lg text-muted sm:text-2xl">Aún no hay partidas. ¡Sé el primero en el ranking!</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col gap-2">
          {ranking.map((e, i) => {
            const clave = claveFila(e);
            const destacada = destacadas.has(clave);
            return (
              <motion.li
                key={clave}
                layout={!reducido}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className={cn(
                  "flex min-h-12 flex-1 items-center gap-2 rounded-lg px-2 sm:min-h-14 sm:gap-3 sm:px-3",
                  i < 3 ? "bg-surface-2" : "bg-transparent",
                  destacada && "bg-warning/30 ring-2 ring-warning",
                  !reducido && "transition-colors duration-700",
                )}
              >
                <Posicion n={i + 1} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold sm:text-3xl" title={e.jugador}>
                    {e.jugador}
                  </span>
                  <ChipsInsignias ids={e.insignias} />
                </div>
                {e.tiempoTotalMs !== undefined && e.tiempoTotalMs !== null ? (
                  <span
                    className="shrink-0 font-display text-base font-semibold tabular-nums text-muted sm:text-3xl"
                    aria-label={`Tiempo total ${formatearTiempoTotal(e.tiempoTotalMs)}`}
                  >
                    {formatearTiempoTotal(e.tiempoTotalMs)}
                  </span>
                ) : null}
                <span className="shrink-0 font-display text-2xl font-bold tabular-nums sm:text-4xl">
                  {e.puntaje}
                  <span className="sr-only"> puntos</span>
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
