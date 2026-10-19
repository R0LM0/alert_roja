"use client";

import { Activity, Sigma, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { StatCard } from "@/components/game/stat-card";
import { formatoEntero, formatoPct, type StatsPanel } from "@/lib/panel";
import { Destello } from "./Destello";
import { useDestello, useValorAnimado } from "./useAnimacionesPanel";

type Props = { stats: StatsPanel | undefined };

type TarjetaProps = {
  titulo: string;
  nota: string;
  Icono: LucideIcon;
  retardo: number;
  /** Valor final en %; null o undefined muestra "—". */
  destino: number | null | undefined;
};

/** Cifra en % que cuenta hasta su valor nuevo y destella al cambiar. */
function TarjetaAnimada({ titulo, nota, Icono, retardo, destino }: TarjetaProps) {
  const mostrado = useValorAnimado(destino);
  const clave = useDestello(destino);
  return (
    <div className="relative grid min-w-0">
      <StatCard
        Icono={Icono}
        retardo={retardo}
        titulo={titulo}
        valor={formatoPct(mostrado)}
        nota={nota}
      />
      <Destello clave={clave} />
    </div>
  );
}

/** Cuatro cifras clave del público; "—" cuando aún no hay respuestas. */
export function TarjetasEstadisticas({ stats }: Props) {
  const hayDatos = stats !== undefined && stats.n > 0;
  // Sin estimaciones (p. ej. lista vacía) se ocultan las dos tarjetas que dependen de ellas.
  const hayEstimaciones = stats?.estimacionPromedioPct !== null && stats?.estimacionPromedioPct !== undefined;

  return (
    <section aria-label="Cifras clave" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {hayEstimaciones ? (
        <TarjetaAnimada
          Icono={Target}
          retardo={0}
          titulo="Estimación promedio"
          destino={hayDatos ? stats.estimacionPromedioPct : null}
          nota={hayDatos ? `${formatoEntero(stats.n)} respuestas` : "Sin respuestas aún"}
        />
      ) : null}
      <TarjetaAnimada
        Icono={Activity}
        retardo={1.2}
        titulo="VPP observado"
        destino={hayDatos ? stats.vppObservadoPct : null}
        nota="Infectados entre los positivos"
      />
      <TarjetaAnimada
        Icono={Sigma}
        retardo={2.4}
        titulo="VPP teórico"
        destino={stats?.vppTeoricoPct}
        nota="Según el teorema de Bayes"
      />
      {hayEstimaciones ? (
        <TarjetaAnimada
          Icono={TrendingUp}
          retardo={3.6}
          titulo="Sobreestimaron"
          destino={hayDatos ? stats.pctSobreestiman : null}
          nota="Estimaron por encima del VPP"
        />
      ) : null}
    </section>
  );
}
