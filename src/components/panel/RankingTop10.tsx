import { Medal, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { EntradaRanking } from "@/lib/panel";
import { ETIQUETA_TEMPORADA_ACTUAL, formatearTiempoTotal } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Props = { ranking: EntradaRanking[] | undefined };

const COLOR_PODIO = ["text-warning", "text-foreground", "text-primary-text"] as const;

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

/** Top 10 (primer intento por apodo): puntaje, y a igual puntaje gana el menor tiempo total. Orden de la API. */
export function RankingTop10({ ranking }: Props) {
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
          {ranking.map((e, i) => (
            <li
              key={`${e.creada_en}-${i}`}
              className={cn(
                "flex min-h-12 flex-1 items-center gap-2 rounded-lg px-2 sm:min-h-14 sm:gap-3 sm:px-3",
                i < 3 ? "bg-surface-2" : "bg-transparent",
              )}
            >
              <Posicion n={i + 1} />
              <span className="min-w-0 flex-1 truncate text-lg font-semibold sm:text-3xl" title={e.jugador}>
                {e.jugador}
              </span>
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
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
