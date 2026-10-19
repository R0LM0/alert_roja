import { z } from "zod";

/** Lógica pura del panel del proyector (sin React). */

const esquemaCubeta = z.object({
  desde: z.number(),
  hasta: z.number(),
  cantidad: z.number(),
});

/** Forma de GET /api/stats?prevalencia= (ver src/app/api/stats/route.ts). */
export const esquemaStats = z.object({
  prevalencia: z.number().nullable(),
  totalPartidas: z.number(),
  /** Jugadores distintos (primeros intentos); opcional por compatibilidad. */
  totalJugadores: z.number().optional(),
  n: z.number(),
  estimacionPromedioPct: z.number().nullable(),
  vppObservadoPct: z.number().nullable(),
  vppTeoricoPct: z.number(),
  pctSobreestiman: z.number().nullable(),
  pctAislados: z.number().nullable(),
  aisladosSanos: z.number(),
  liberadosInfectados: z.number(),
  histograma: z.array(esquemaCubeta),
});

/** Forma de GET /api/ranking?prevalencia= (ver src/app/api/ranking/route.ts). */
export const esquemaRanking = z.object({
  ranking: z.array(
    z.object({
      jugador: z.string(),
      puntaje: z.number(),
      prevalencia: z.number(),
      creada_en: z.string(),
      tiempoTotalMs: z.number().nullable().optional(),
      insignias: z.array(z.string()).default([]),
    }),
  ),
});

/** Una partida del feed "Acaban de jugar" (todos los intentos, no solo el primero). */
const esquemaActividadPartida = z.object({
  id: z.string(),
  jugador: z.string(),
  puntaje: z.number(),
  creada_en: z.string(),
  primer_intento: z.boolean(),
});

/** Forma de GET /api/actividad?prevalencia= (ver src/app/api/actividad/route.ts). */
export const esquemaActividad = z.object({
  actividad: z.array(esquemaActividadPartida),
});

export type StatsPanel = z.infer<typeof esquemaStats>;
export type RankingPanel = z.infer<typeof esquemaRanking>;
export type EntradaRanking = RankingPanel["ranking"][number];
export type CubetaApi = z.infer<typeof esquemaCubeta>;
export type ActividadPanel = z.infer<typeof esquemaActividad>;
export type EntradaActividad = ActividadPanel["actividad"][number];

export type FilaHistograma = CubetaApi & { etiqueta: string; porcentaje: number };

/** Filas del gráfico: etiqueta "0–9"… "90–100" y porcentaje sobre el total de respuestas. */
export function datosHistograma(histograma: CubetaApi[]): FilaHistograma[] {
  const total = histograma.reduce((a, c) => a + c.cantidad, 0);
  return histograma.map((c) => ({
    ...c,
    etiqueta: `${c.desde}–${c.hasta}`,
    porcentaje: total === 0 ? 0 : (c.cantidad / total) * 100,
  }));
}

const CUBETAS = 10;

/**
 * Posición de una línea vertical sobre el eje de 10 cubetas.
 * `posicion` va de 0 a 10 (0 = borde izquierdo de "0–9", 10 = borde derecho de "90–100").
 */
export function posicionLineaVpp(vppPct: number): { indice: number; offset: number; posicion: number } {
  const posicion = Math.min(CUBETAS, Math.max(0, vppPct / 10));
  const indice = Math.min(CUBETAS - 1, Math.floor(posicion));
  return { indice, offset: posicion - indice, posicion };
}

/** Alineación del texto respecto a la línea vertical. */
export type AnclajeEtiqueta = "start" | "middle" | "end";

const BORDE_ETIQUETA = 3;

/**
 * Hacia dónde crece la etiqueta de la línea para no recortarse en los bordes:
 * cerca del borde izquierdo el texto sigue a la derecha de la línea ("start"),
 * cerca del derecho va a su izquierda ("end"), y en el centro se centra.
 */
export function anclajeEtiquetaVpp(posicion: number): AnclajeEtiqueta {
  if (posicion < BORDE_ETIQUETA) return "start";
  if (posicion > CUBETAS - BORDE_ETIQUETA) return "end";
  return "middle";
}

/** "hace 5 s", "hace 2 min", "hace 3 h", "hace 2 d" desde `creadaEn` hasta `ahora` (ms). Nunca negativo; "" si la fecha no sirve. */
export function tiempoRelativo(creadaEn: string, ahora: number): string {
  const t = Date.parse(creadaEn);
  if (!Number.isFinite(t)) return "";
  const seg = Math.max(0, Math.floor((ahora - t) / 1000));
  if (seg < 60) return `hace ${seg} s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/** Número con coma decimal (es), sin depender de los datos ICU del entorno. */
export function formatoNumero(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace(".", ",");
}

/** "33,3 %" o "—" si no hay dato. */
export function formatoPct(n: number | null | undefined, decimales = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${formatoNumero(n, decimales)} %`;
}

export function formatoEntero(n: number): string {
  return String(Math.round(n));
}

/** URL pública del juego para el QR: NEXT_PUBLIC_SITE_URL o, si falta o es inválida, el origin actual. */
export function urlJuego(siteUrl: string | undefined, origin: string): string {
  const candidatas = [siteUrl, origin].map((u) => (u ?? "").trim());
  const base = candidatas.find((u) => /^https?:\/\/\S+$/i.test(u));
  return base ? `${base.replace(/\/+$/, "")}/` : "";
}

/** Texto legible de la URL (sin protocolo ni barra final). */
export function urlLegible(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/** Enlace de descarga del Excel (`?formato=csv` para el CSV); `key` solo se agrega si el panel la recibió en su URL. */
export function urlExport(key?: string, formato: "xlsx" | "csv" = "xlsx"): string {
  const params = [formato === "csv" ? "formato=csv" : "", key ? `key=${encodeURIComponent(key)}` : ""].filter(Boolean);
  return params.length ? `/api/export?${params.join("&")}` : "/api/export";
}
