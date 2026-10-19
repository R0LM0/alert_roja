import { Activity, Sigma, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/game/stat-card";
import { formatoEntero, formatoPct, type StatsPanel } from "@/lib/panel";

type Props = { stats: StatsPanel | undefined };

/** Cuatro cifras clave del público; "—" cuando aún no hay respuestas. */
export function TarjetasEstadisticas({ stats }: Props) {
  const hayDatos = stats !== undefined && stats.n > 0;
  const hayEstimaciones = stats?.estimacionPromedioPct !== null && stats?.estimacionPromedioPct !== undefined;
  const dato = (v: number | null | undefined) => (hayDatos ? formatoPct(v) : "—");

  return (
    <section aria-label="Cifras clave" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {hayEstimaciones ? (
        <StatCard
          Icono={Target}
          retardo={0}
          titulo="Estimación promedio"
          valor={dato(stats?.estimacionPromedioPct)}
          nota={hayDatos ? `${formatoEntero(stats.n)} respuestas` : "Sin respuestas aún"}
        />
      ) : null}
      <StatCard
        Icono={Activity}
        retardo={1.2}
        titulo="VPP observado"
        valor={dato(stats?.vppObservadoPct)}
        nota="Infectados entre los positivos"
      />
      <StatCard
        Icono={Sigma}
        retardo={2.4}
        titulo="VPP teórico"
        valor={stats ? formatoPct(stats.vppTeoricoPct) : "—"}
        nota="Según el teorema de Bayes"
      />
      {hayEstimaciones ? (
        <StatCard
          Icono={TrendingUp}
          retardo={3.6}
          titulo="Sobreestimaron"
          valor={dato(stats?.pctSobreestiman)}
          nota="Estimaron por encima del VPP"
        />
      ) : null}
    </section>
  );
}
