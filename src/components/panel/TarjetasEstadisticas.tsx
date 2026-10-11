import { Activity, Sigma, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/game/stat-card";
import { formatoEntero, formatoPct, type StatsPanel } from "@/lib/panel";

type Props = { stats: StatsPanel | undefined };

// Cifra grande: 6xl en pantallas medianas, 8xl (el de StatCard) desde 1536 px.
const CIFRA = "[&>p:nth-child(2)]:text-6xl 2xl:[&>p:nth-child(2)]:text-8xl";

/** Cuatro cifras clave del público; "—" cuando aún no hay respuestas. */
export function TarjetasEstadisticas({ stats }: Props) {
  const hayDatos = stats !== undefined && stats.n > 0;
  const dato = (v: number | null | undefined) => (hayDatos ? formatoPct(v) : "—");

  return (
    <section aria-label="Cifras clave" className="grid grid-cols-2 gap-4">
      <StatCard
        className={CIFRA}
        Icono={Target}
        retardo={0}
        titulo="Estimación promedio"
        valor={dato(stats?.estimacionPromedioPct)}
        nota={hayDatos ? `${formatoEntero(stats.n)} respuestas` : "Sin respuestas aún"}
      />
      <StatCard
        className={CIFRA}
        Icono={Activity}
        retardo={1.2}
        titulo="VPP observado"
        valor={dato(stats?.vppObservadoPct)}
        nota="Infectados entre los positivos"
      />
      <StatCard
        className={CIFRA}
        Icono={Sigma}
        retardo={2.4}
        titulo="VPP teórico"
        valor={stats ? formatoPct(stats.vppTeoricoPct) : "—"}
        nota="Según el teorema de Bayes"
      />
      <StatCard
        className={CIFRA}
        Icono={TrendingUp}
        retardo={3.6}
        titulo="Sobreestimaron"
        valor={dato(stats?.pctSobreestiman)}
        nota="Estimaron por encima del VPP"
      />
    </section>
  );
}
