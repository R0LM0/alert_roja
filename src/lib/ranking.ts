import { normalizarApodo } from "./apodos";
import { resolverInsignias, type IconoInsignia, type InsigniaInfo } from "./insignias";

/** Regla del ranking: solo el primer intento por apodo y dificultad; desempate por menor tiempo total. */

/** Los chips del panel solo dibujan estos tres iconos; las medallas nuevas usan el más parecido. */
export type IconoChip = "brain" | "shield-check" | "smile";
const ICONO_CHIP: Record<IconoInsignia, IconoChip> = {
  brain: "brain",
  "shield-check": "shield-check",
  smile: "smile",
  zap: "smile",
  leaf: "shield-check",
  "flask-conical": "brain",
};

/** Convierte ids recibidos por la API en chips visibles, omitiendo los que no conoce este cliente. */
export function informacionInsignias(ids: readonly string[]): { id: InsigniaInfo["id"]; titulo: string; icono: IconoChip }[] {
  return resolverInsignias(ids).map(({ id, titulo, icono }) => ({ id, titulo, icono: ICONO_CHIP[icono] }));
}

export const INICIO_TEMPORADA_ACTUAL = "2026-10-19T00:00:00.000Z";
export const NOMBRE_TEMPORADA_ACTUAL = "Decisiones";
export const ETIQUETA_TEMPORADA_ACTUAL = "Temporada actual: decisiones (desde el 19/10/2026). Las partidas anteriores quedan archivadas.";

export function enTemporadaActual(creadaEn: string): boolean {
  return Date.parse(creadaEn) >= Date.parse(INICIO_TEMPORADA_ACTUAL);
}

export { normalizarApodo };

/** "m:ss" (segundo más cercano) o "—" si no hay dato. */
export function formatearTiempoTotal(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.round(ms / 1000);
  const seg = String(total % 60).padStart(2, "0");
  return `${Math.floor(total / 60)}:${seg}`;
}

export type EntradaOrdenable = {
  puntaje: number;
  tiempoTotalMs: number | null;
  creadaEn: string;
};

/** Mayor puntaje, luego menor tiempo total (desconocido al final), luego más antiguo. */
export function compararRanking(a: EntradaOrdenable, b: EntradaOrdenable): number {
  if (a.puntaje !== b.puntaje) return b.puntaje - a.puntaje;
  const ta = a.tiempoTotalMs ?? Number.POSITIVE_INFINITY;
  const tb = b.tiempoTotalMs ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta < tb ? -1 : 1;
  return Date.parse(a.creadaEn) - Date.parse(b.creadaEn);
}

/** Conserva la partida más antigua de cada (apodo, prevalencia). Espejo en memoria de la regla SQL. */
export function seleccionarPrimerosIntentos<T extends { jugador: string; prevalencia: number; creadaEn: string }>(
  filas: T[],
): T[] {
  const primeras = new Map<string, T>();
  for (const f of filas) {
    const clave = `${normalizarApodo(f.jugador)}|${f.prevalencia}`;
    const previa = primeras.get(clave);
    if (!previa || Date.parse(f.creadaEn) < Date.parse(previa.creadaEn)) primeras.set(clave, f);
  }
  return filas.filter((f) => primeras.get(`${normalizarApodo(f.jugador)}|${f.prevalencia}`) === f);
}

export type Cubeta = { desde: number; hasta: number; cantidad: number };

/** 10 cubetas de 10 puntos: 0-9, 10-19, ..., 90-100. */
export function construirHistograma(estimaciones: number[]): Cubeta[] {
  const cubetas = Array.from({ length: 10 }, (_, i) => ({
    desde: i * 10,
    hasta: i === 9 ? 100 : i * 10 + 9,
    cantidad: 0,
  }));
  for (const e of estimaciones) cubetas[Math.min(Math.max(Math.floor(e / 10), 0), 9)].cantidad++;
  return cubetas;
}
