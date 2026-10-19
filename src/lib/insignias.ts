import { UMBRAL_DECISION } from "./caso-bayesiano";
import { TIEMPO_RAYO_MS, type Insignia } from "./stats";

/** Iconos lucide de las medallas; el componente de resultado los mapea por nombre. */
export type IconoInsignia = "brain" | "shield-check" | "smile" | "zap" | "leaf" | "flask-conical";

export type InsigniaInfo = { id: Insignia; titulo: string; descripcion: string; icono: IconoInsignia };

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
  experto: {
    id: "experto",
    titulo: "Experto",
    descripcion: "En modo experto tomaste 7 o más decisiones de mayor valor esperado.",
    icono: "flask-conical",
  },
  rayo: {
    id: "rayo",
    titulo: "Rayo",
    descripcion: `Terminaste la ronda en menos de ${TIEMPO_RAYO_MS / 1000} segundos.`,
    icono: "zap",
  },
  "sin-panico": {
    id: "sin-panico",
    titulo: "Sin pánico",
    descripcion: "No aislaste a ningún paciente sano con poca evidencia.",
    icono: "leaf",
  },
};

/** Cómo ganarla: texto de las medallas bloqueadas, para que el jugador quiera repetir. */
const REQUISITOS: Record<Insignia, string> = {
  perfecto: "Toma las 10 decisiones de mayor valor esperado de la ronda.",
  "ojo-clinico": "Toma 8 o 9 decisiones de mayor valor esperado de la ronda.",
  cazador: "Aísla a todos los pacientes infectados de una ronda con contagios.",
  "bayesiano-nato": "Tu estimación promedio queda entre 25 % y 40 %.",
  experto: "En modo experto, toma 7 o más decisiones de mayor valor esperado.",
  rayo: `Termina la ronda en menos de ${TIEMPO_RAYO_MS / 1000} segundos.`,
  "sin-panico": `No aísles a ningún sano con poca evidencia (probabilidad bajo ${Math.round(UMBRAL_DECISION * 100)} %).`,
};

/** Medallas que ya no se pueden ganar con el juego actual: solo se muestran si ya están ganadas. */
const LEGADAS: ReadonlySet<Insignia> = new Set<Insignia>(["bayesiano-nato"]);

/** Los ids válidos para persistencia se derivan del catálogo, no de otra lista. */
export const IDS_INSIGNIAS = Object.keys(CATALOGO_INSIGNIAS) as [Insignia, ...Insignia[]];

/** Conserva el orden de los ids recibidos y omite los que ya no están en el catálogo. */
export function resolverInsignias(ids: readonly string[]): InsigniaInfo[] {
  return ids.flatMap((id) => Object.hasOwn(CATALOGO_INSIGNIAS, id) ? [CATALOGO_INSIGNIAS[id as Insignia]] : []);
}

export type MedallaInsignia = { info: InsigniaInfo; requisito: string; ganada: boolean };

/** Vista de medallas: todo el catálogo en su orden, con ganada o bloqueada y su requisito. */
export function medallasInsignias(ganadas: readonly string[]): MedallaInsignia[] {
  return IDS_INSIGNIAS.flatMap((id) => {
    const ganada = ganadas.includes(id);
    if (LEGADAS.has(id) && !ganada) return [];
    return [{ info: CATALOGO_INSIGNIAS[id], requisito: REQUISITOS[id], ganada }];
  });
}
