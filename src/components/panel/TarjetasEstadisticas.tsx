"use client";

import { Activity, CircleCheck, Sigma, Star, type LucideIcon } from "lucide-react";
import { StatCard } from "@/components/game/stat-card";
import { formatoEntero, formatoPct, formatoPuntaje, type StatsPanel } from "@/lib/panel";
import { Destello } from "./Destello";
import { EntradaPanel } from "./EntradaPanel";
import { useDestello, useValorAnimado } from "./useAnimacionesPanel";

type Props = {
  stats: StatsPanel | undefined;
  /** Con false, las cifras que revelan la respuesta (VPP) muestran "?". */
  revelar: boolean;
};

type TarjetaProps = {
  titulo: string;
  nota: string;
  Icono: LucideIcon;
  retardo: number;
  /** Valor final; null o undefined muestra "—". */
  destino: number | null | undefined;
  formato: (n: number | null | undefined) => string;
  /** Oculta el valor (muestra "?") sin animarlo ni destellarlo. */
  oculto?: boolean;
};

/** Cifra que cuenta hasta su valor nuevo y destella al cambiar. */
function TarjetaAnimada({ titulo, nota, Icono, retardo, destino, formato, oculto = false }: TarjetaProps) {
  const visible = oculto ? null : destino;
  const mostrado = useValorAnimado(visible);
  const clave = useDestello(visible);
  return (
    <div className="relative grid min-w-0">
      <StatCard
        Icono={Icono}
        retardo={retardo}
        titulo={titulo}
        valor={oculto ? "?" : formato(mostrado)}
        nota={nota}
      />
      <Destello clave={clave} />
    </div>
  );
}

/** Cuatro cifras de la temporada: decisiones (siempre visibles) y las dos que revelan la respuesta. */
export function TarjetasEstadisticas({ stats, revelar }: Props) {
  const hayDatos = stats !== undefined && stats.n > 0;

  return (
    <section aria-label="Cifras clave" className="cifras-panel grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <EntradaPanel retardo={0.1}>
        <TarjetaAnimada
          Icono={CircleCheck}
          retardo={0}
          titulo="Decisiones óptimas del público"
          destino={hayDatos ? stats.decisionesOptimasPct : null}
          formato={formatoPct}
          nota={hayDatos ? `${formatoEntero(stats.n)} pacientes decididos` : "Sin decisiones aún"}
        />
      </EntradaPanel>
      <EntradaPanel retardo={0.2}>
        <TarjetaAnimada
          Icono={Star}
          retardo={1.2}
          titulo="Puntaje promedio"
          destino={stats?.puntajePromedio ?? null}
          formato={formatoPuntaje}
          nota="De 10 posibles, primer intento"
        />
      </EntradaPanel>
      <EntradaPanel retardo={0.3}>
        <TarjetaAnimada
          Icono={Activity}
          retardo={2.4}
          titulo="VPP observado"
          destino={hayDatos ? stats.vppObservadoPct : null}
          formato={formatoPct}
          oculto={!revelar}
          nota="Infectados entre los positivos"
        />
      </EntradaPanel>
      <EntradaPanel retardo={0.4}>
        <TarjetaAnimada
          Icono={Sigma}
          retardo={3.6}
          titulo="VPP teórico"
          destino={stats?.vppTeoricoPct}
          formato={formatoPct}
          oculto={!revelar}
          nota="Según el teorema de Bayes"
        />
      </EntradaPanel>
    </section>
  );
}
