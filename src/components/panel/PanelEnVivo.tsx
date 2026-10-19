"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { urlPodio } from "@/lib/panel";
import { cn } from "@/lib/utils";
import { ActividadReciente } from "./ActividadReciente";
import { BotonExportar } from "./BotonExportar";
import { ContadorPartidas } from "./ContadorPartidas";
import { FiltroPrevalencia } from "./FiltroPrevalencia";
import { FondoPanel } from "./FondoPanel";
import { HistogramaEstimaciones } from "./HistogramaEstimaciones";
import { IndicadorEnVivo } from "./IndicadorEnVivo";
import { QrJuego } from "./QrJuego";
import { RankingTop10 } from "./RankingTop10";
import { TarjetasEstadisticas } from "./TarjetasEstadisticas";
import { usePanelDatos, type ModoPanel } from "./usePanelDatos";

type Props = { clave?: string };

/** Panel del proyector: QR + contador + actividad | cifras + histograma | ranking. Actualiza cada 2 s. */
export function PanelEnVivo({ clave }: Props) {
  const [modo, setModo] = useState<ModoPanel>("normal");
  const { stats, ranking, actividad, error, cargando, desactualizado, ultimaActualizacion } = usePanelDatos(modo);

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
            <QrJuego />
            <ContadorPartidas total={stats?.totalPartidas} />
          </div>

          <div className="flex min-h-0 flex-col gap-3 sm:gap-4 2xl:gap-6">
            <TarjetasEstadisticas stats={stats} />
            <HistogramaEstimaciones
              histograma={stats?.histograma}
              vppTeoricoPct={stats?.vppTeoricoPct}
              totalRespuestas={stats?.n ?? 0}
            />
          </div>

          <div className="flex min-h-0 flex-col lg:col-span-2 2xl:col-span-1">
            <RankingTop10 ranking={ranking} />
          </div>

          <div className="flex min-h-0 flex-col lg:col-span-2 2xl:col-span-3">
            <ActividadReciente actividad={actividad} />
          </div>
        </div>
      </main>
    </FondoPanel>
  );
}
