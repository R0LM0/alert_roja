import { z } from "zod";

/** Lógica pura del panel del proyector (sin React). */

/** Una evidencia del gráfico de decisiones (ver src/lib/decisiones.ts). */
const esquemaEvidencia = z.object({
  evidencia: z.string(),
  etiqueta: z.string(),
  previoPct: z.number(),
  posteriorPct: z.number(),
  optima: z.enum(["aislar", "liberar"]),
  casos: z.number(),
  aislaronPct: z.number().nullable(),
});

/** Forma de GET /api/stats?prevalencia= (ver src/app/api/stats/route.ts). Solo decisiones de temporada, primer intento. */
export const esquemaStats = z.object({
  prevalencia: z.number().nullable(),
  totalPartidas: z.number(),
  /** Jugadores distintos (primeros intentos); opcional por compatibilidad. */
  totalJugadores: z.number().optional(),
  n: z.number(),
  vppTeoricoPct: z.number(),
  vppObservadoPct: z.number().nullable(),
  decisionesOptimasPct: z.number().nullable(),
  puntajePromedio: z.number().nullable(),
  porEvidencia: z.array(esquemaEvidencia),
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
export type EvidenciaPanel = z.infer<typeof esquemaEvidencia>;
export type ActividadPanel = z.infer<typeof esquemaActividad>;
export type EntradaActividad = ActividadPanel["actividad"][number];

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

/** Puntaje promedio por ronda (0 a 10): "6,4" o "—". */
export function formatoPuntaje(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return formatoNumero(n, 1);
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

/** Enlace al podio de la feria (protegido por la misma clave del panel). */
export function urlPodio(key?: string): string {
  return key ? `/podio?key=${encodeURIComponent(key)}` : "/podio";
}

/** Valor de ?revelar=: "1" o "true" muestran las respuestas (VPP teórico, VPP observado, óptimas); cualquier otra cosa las oculta. */
export function esRevelarActivo(valor: string | null | undefined): boolean {
  return valor === "1" || valor === "true";
}

/** Lee ?revelar= de una query string ("?key=x&revelar=1" o "key=x&revelar=1"). */
export function leerRevelar(query: string): boolean {
  return esRevelarActivo(new URLSearchParams(query).get("revelar"));
}

/** Query con revelar fijado en `revelar` y el resto de parámetros intacto (p. ej. key). Vacía si no queda nada. */
export function queryConRevelar(query: string, revelar: boolean): string {
  const params = new URLSearchParams(query);
  if (revelar) params.set("revelar", "1");
  else params.delete("revelar");
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}
