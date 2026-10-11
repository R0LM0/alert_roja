"use client";

import { useState } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotonExportar } from "./BotonExportar";
import { ContadorPartidas } from "./ContadorPartidas";
import { FiltroPrevalencia } from "./FiltroPrevalencia";
import { FondoPanel } from "./FondoPanel";
import { HistogramaEstimaciones } from "./HistogramaEstimaciones";
import { QrJuego } from "./QrJuego";
import { RankingTop10 } from "./RankingTop10";
import { TarjetasEstadisticas } from "./TarjetasEstadisticas";
import { usePanelDatos, type ModoPanel } from "./usePanelDatos";

type Props = { clave?: string };

/** Panel del proyector: QR + contador | cifras + histograma | ranking. Actualiza cada 3,5 s. */
export function PanelEnVivo({ clave }: Props) {
  const [modo, setModo] = useState<ModoPanel>("normal");
  const { stats, ranking, error, cargando, desactualizado } = usePanelDatos(modo);

  return (
    <FondoPanel pulso={stats?.totalPartidas ?? 0}>
      <main className="panel-pantalla mx-auto flex w-full max-w-[120rem] flex-col gap-3 p-3 sm:gap-4 sm:p-4 2xl:gap-6 2xl:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3 pr-12 sm:gap-4 2xl:pr-16">
          <h1 className="font-display text-2xl leading-tight font-bold sm:text-4xl 2xl:text-6xl">
            <span className="text-primary-text">Alerta Roja</span> · Panel en vivo
          </h1>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:gap-4">
            <FiltroPrevalencia modo={modo} onCambiar={setModo} />
            <BotonExportar clave={clave} />
          </div>
        </header>

        {error ? (
          <p role="status" className="flex items-center gap-3 rounded-lg border-2 border-warning bg-surface px-4 py-3 text-xl font-semibold text-warning">
            <WifiOff aria-hidden="true" className="size-6 shrink-0" />
            Sin conexión con el servidor — reintentando…
          </p>
        ) : null}

        <div
          aria-busy={cargando || desactualizado}
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 gap-3 transition sm:gap-4-opacity lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)_32rem] 2xl:grid-rows-[minmax(0,1fr)] 2xl:gap-6",
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
        </div>
      </main>
    </FondoPanel>
  );
}
