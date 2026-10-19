import type { Insignia } from "./stats";

export type InsigniaInfo = { id: Insignia; titulo: string; descripcion: string; icono: "brain" | "shield-check" | "smile" };

/** Único catálogo de textos e iconos para resultado, historial y ranking. */
const CATALOGO_INSIGNIAS: Record<Insignia, InsigniaInfo> = {
  perfecto: {
    id: "perfecto",
    titulo: "Ronda perfecta",
    descripcion: "Tomaste las 10 decisiones de mayor valor esperado de la ronda.",
    icono: "smile",
  },
  "ojo-clinico": {
    id: "ojo-clinico",
    titulo: "Ojo clínico",
    descripcion: "Tomaste 8 o 9 decisiones de mayor valor esperado de la ronda.",
    icono: "brain",
  },
  cazador: {
    id: "cazador",
    titulo: "Cazador de contagios",
    descripcion: "Aislaste a todos los pacientes infectados de esta ronda.",
    icono: "shield-check",
  },
  "bayesiano-nato": {
    id: "bayesiano-nato",
    titulo: "Bayesiano nato",
    descripcion: "Tu estimación promedio quedó entre 25 % y 40 %, cerca de la realidad.",
    icono: "brain",
  },
};

/** Los ids válidos para persistencia se derivan del catálogo, no de otra lista. */
export const IDS_INSIGNIAS = Object.keys(CATALOGO_INSIGNIAS) as [Insignia, ...Insignia[]];

/** Conserva el orden de los ids recibidos y omite los que ya no están en el catálogo. */
export function resolverInsignias(ids: readonly string[]): InsigniaInfo[] {
  return ids.flatMap((id) => Object.hasOwn(CATALOGO_INSIGNIAS, id) ? [CATALOGO_INSIGNIAS[id as Insignia]] : []);
}
