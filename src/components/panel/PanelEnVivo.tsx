"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { queryConRevelar, urlPodio } from "@/lib/panel";
import { cn } from "@/lib/utils";
import { ActividadReciente } from "./ActividadReciente";
import { BotonExportar } from "./BotonExportar";
import { ContadorPartidas } from "./ContadorPartidas";
import { EntradaPanel } from "./EntradaPanel";
import { FiltroPrevalencia } from "./FiltroPrevalencia";
import { FondoPanel } from "./FondoPanel";
import { GraficoDecisiones } from "./GraficoDecisiones";
import { IndicadorEnVivo } from "./IndicadorEnVivo";
import { QrJuego } from "./QrJuego";
import { RankingTop10 } from "./RankingTop10";
import { TarjetasEstadisticas } from "./TarjetasEstadisticas";
import { PREVALENCIA_POR_MODO, usePanelDatos, type ModoPanel } from "./usePanelDatos";

type Props = {
  clave?: string;
  /** Valor de ?revelar=1 en la URL al cargar; el presentador lo cambia con el botón. */
  revelarInicial?: boolean;
};

/** Panel del proyector: QR + contador + actividad | cifras + decisiones | ranking. Actualiza cada 2 s. */
export function PanelEnVivo({ clave, revelarInicial = false }: Props) {
  const [modo, setModo] = useState<ModoPanel>("normal");
  const [revelar, setRevelar] = useState(revelarInicial);
  const { stats, ranking, actividad, error, cargando, desactualizado, ultimaActualizacion } = usePanelDatos(modo);

  // Cambia ?revelar= sin recargar ni pasar por el servidor; la URL queda compartible.
  function alternarRevelar() {
    const siguiente = !revelar;
    setRevelar(siguiente);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${queryConRevelar(search, siguiente)}`);
  }

  return (
    <FondoPanel pulso={stats?.totalPartidas ?? 0}>
      <main className="panel-pantalla mx-auto flex w-full max-w-[120rem] flex-col gap-3 p-3 sm:gap-4 sm:p-4 2xl:gap-6 2xl:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3 pr-12 sm:gap-4 2xl:pr-16">
          <h1 className="font-display text-2xl leading-tight font-bold sm:text-4xl 2xl:text-5xl">
            <span className="text-primary-text">Alerta Roja</span> · Panel en vivo
          </h1>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:gap-4">
            <IndicadorEnVivo ultimaActualizacion={ultimaActualizacion} error={error} />
            <FiltroPrevalencia modo={modo} onCambiar={setModo} />
            <button
              type="button"
              aria-pressed={revelar}
              onClick={alternarRevelar}
              className={cn(
                buttonVariants({ variant: revelar ? "warning" : "outline", size: "lg" }),
                "min-h-11 flex-1 gap-2 text-base sm:min-h-14 sm:flex-none sm:text-xl 2xl:text-2xl",
              )}
            >
              {revelar ? <EyeOff aria-hidden="true" className="size-5 sm:size-6" /> : <Eye aria-hidden="true" className="size-5 sm:size-6" />}
              {revelar ? "Ocultar respuesta" : "Revelar respuesta"}
            </button>
            <a
              href={urlPodio(clave)}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11 flex-1 text-base sm:min-h-14 sm:flex-none sm:text-xl 2xl:text-2xl")}
            >
              Podio
            </a>
            <BotonExportar clave={clave} />
          </div>
        </header>

        <div
          aria-busy={cargando || desactualizado}
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 gap-3 transition-opacity sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)_32rem] 2xl:grid-rows-[minmax(0,1fr)_auto] 2xl:gap-6",
            desactualizado && "opacity-60",
          )}
        >
          <div className="flex min-h-0 flex-col gap-3 sm:gap-4 2xl:gap-6">
            <EntradaPanel retardo={0}>
              <QrJuego />
            </EntradaPanel>
            <EntradaPanel retardo={0.1}>
              <ContadorPartidas total={stats?.totalPartidas} />
            </EntradaPanel>
          </div>

          <div className="flex min-h-0 flex-col gap-3 sm:gap-4 2xl:gap-6">
            <TarjetasEstadisticas stats={stats} revelar={revelar} />
            <EntradaPanel retardo={0.5} className="flex-1">
              <GraficoDecisiones porEvidencia={stats?.porEvidencia} n={stats?.n ?? 0} revelar={revelar} />
            </EntradaPanel>
          </div>

          <EntradaPanel retardo={0.6} className="lg:col-span-2 2xl:col-span-1">
            <RankingTop10 ranking={ranking} prevalencia={PREVALENCIA_POR_MODO[modo]} />
          </EntradaPanel>

          <EntradaPanel retardo={0.7} className="lg:col-span-2 2xl:col-span-3">
            <ActividadReciente actividad={actividad} />
          </EntradaPanel>
        </div>
      </main>
    </FondoPanel>
  );
}
