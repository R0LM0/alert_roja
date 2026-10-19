"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  esquemaActividad,
  esquemaRanking,
  esquemaStats,
  type ActividadPanel,
  type RankingPanel,
  type StatsPanel,
} from "@/lib/panel";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "@/lib/stats";

export type ModoPanel = "normal" | "experto";

/** Prevalencia que se envía SIEMPRE a la API (sin filtro, la API mezcla ambos modos). */
export const PREVALENCIA_POR_MODO: Record<ModoPanel, number> = {
  normal: PREVALENCIA,
  experto: PREVALENCIA_EXPERTO,
};

/** Sondeo del panel (ms). Debe ser mayor que DEDUPE_MS, o SWR podría saltarse sondeos. */
export const INTERVALO_MS = 2000;
const DEDUPE_MS = 1000;

async function pedirJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const fetcherStats = async (url: string): Promise<StatsPanel> => esquemaStats.parse(await pedirJson(url));
const fetcherRanking = async (url: string): Promise<RankingPanel> => esquemaRanking.parse(await pedirJson(url));
const fetcherActividad = async (url: string): Promise<ActividadPanel> => esquemaActividad.parse(await pedirJson(url));

const opciones = {
  refreshInterval: INTERVALO_MS,
  // Pestaña oculta: no se sondea (es el valor por defecto de SWR; se deja explícito).
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: DEDUPE_MS,
  keepPreviousData: true,
  revalidateOnFocus: false,
} as const;

/** Estadísticas, ranking y actividad del modo elegido, con polling cada 2 s. */
export function usePanelDatos(modo: ModoPanel) {
  const prev = PREVALENCIA_POR_MODO[modo];
  const [ultimaActualizacion, setUltimaActualizacion] = useState<number | undefined>(undefined);
  // onSuccess corre en cada respuesta correcta, aunque los datos no cambien.
  const alRecibir = useCallback(() => setUltimaActualizacion(Date.now()), []);
  const sondeo = { ...opciones, onSuccess: alRecibir };

  const stats = useSWR(`/api/stats?prevalencia=${prev}`, fetcherStats, sondeo);
  const ranking = useSWR(`/api/ranking?prevalencia=${prev}`, fetcherRanking, sondeo);
  const actividad = useSWR(`/api/actividad?prevalencia=${prev}`, fetcherActividad, sondeo);
  return {
    stats: stats.data,
    ranking: ranking.data?.ranking,
    actividad: actividad.data?.actividad,
    error: Boolean(stats.error || ranking.error || actividad.error),
    cargando: stats.isLoading || ranking.isLoading,
    // keepPreviousData mantiene los datos del modo anterior hasta que llegan los nuevos.
    desactualizado: stats.data !== undefined && stats.data.prevalencia !== prev,
    ultimaActualizacion,
  };
}
