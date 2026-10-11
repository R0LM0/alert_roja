"use client";

import useSWR from "swr";
import { esquemaRanking, esquemaStats, type RankingPanel, type StatsPanel } from "@/lib/panel";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "@/lib/stats";

export type ModoPanel = "normal" | "experto";

/** Prevalencia que se envía SIEMPRE a la API (sin filtro, la API mezcla ambos modos). */
export const PREVALENCIA_POR_MODO: Record<ModoPanel, number> = {
  normal: PREVALENCIA,
  experto: PREVALENCIA_EXPERTO,
};

export const INTERVALO_MS = 3500;

async function pedirJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const fetcherStats = async (url: string): Promise<StatsPanel> => esquemaStats.parse(await pedirJson(url));
const fetcherRanking = async (url: string): Promise<RankingPanel> => esquemaRanking.parse(await pedirJson(url));

const opciones = {
  refreshInterval: INTERVALO_MS,
  keepPreviousData: true,
  revalidateOnFocus: false,
} as const;

/** Estadísticas y ranking del modo elegido, con polling cada 3,5 s. */
export function usePanelDatos(modo: ModoPanel) {
  const prev = PREVALENCIA_POR_MODO[modo];
  const stats = useSWR(`/api/stats?prevalencia=${prev}`, fetcherStats, opciones);
  const ranking = useSWR(`/api/ranking?prevalencia=${prev}`, fetcherRanking, opciones);
  return {
    stats: stats.data,
    ranking: ranking.data?.ranking,
    error: Boolean(stats.error || ranking.error),
    cargando: stats.isLoading || ranking.isLoading,
    // keepPreviousData mantiene los datos del modo anterior hasta que llegan los nuevos.
    desactualizado: stats.data !== undefined && stats.data.prevalencia !== prev,
  };
}
