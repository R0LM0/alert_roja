// Lógica pura del informe: decisiones por evidencia, frecuencias naturales y lectura automática.
// Sin base ni Excel: todo sale de caso-bayesiano.ts y stats.ts.
import {
  COSTO_AISLAR_SANO,
  COSTO_LIBERAR_ENFERMO,
  EVIDENCIAS,
  UMBRAL_DECISION,
  accionOptima,
  posteriorBayes,
  type Evidencia,
  type ModalidadCaso,
} from "./caso-bayesiano";
import {
  ESPECIFICIDAD,
  N_CIUDAD,
  PREVALENCIA,
  PREVALENCIA_EXPERTO,
  SENSIBILIDAD,
  frecuenciasNaturales,
  type Frecuencias,
} from "./stats";

export type Accion = "aislar" | "liberar";

/** Evidencias en el orden del catálogo. */
export const EVIDENCIAS_ORDEN = Object.keys(EVIDENCIAS) as Evidencia[];

/** Desvío (puntos porcentuales) a partir del cual la lectura automática habla de error del público. */
export const PUNTOS_DESVIO = 15;

const DESCRIPCION_EVIDENCIA: Record<Evidencia, string> = {
  conviviente: "con conviviente que tuvo el caso",
  contacto: "con contacto estrecho",
  sintomas: "con síntomas compatibles",
  "sin-antecedentes": "sin antecedentes",
  protegido: "protegidos (vacunados o con mascarilla)",
};

/** Lo mínimo de una respuesta para contar decisiones. */
export type RespuestaDecision = {
  evidencia: Evidencia | null;
  decision: Accion;
  estabaInfectado: boolean;
};

export type FilaEvidencia = {
  evidencia: Evidencia;
  etiqueta: string;
  previo: number;
  posterior: number;
  optima: Accion;
  casos: number;
  /** Fracciones 0–1; null sin casos. */
  pctAislo: number | null;
  pctOptimas: number | null;
  pctInfectados: number | null;
};

export function modoDePrevalencia(prevalencia: number): ModalidadCaso {
  return prevalencia === PREVALENCIA_EXPERTO ? "experto" : "normal";
}

export function nombreModo(modo: ModalidadCaso): string {
  return modo === "experto" ? "Experto" : "Normal";
}

/** Fracción 0–1 a texto español: 0.333 -> "33,3 %". */
export function formatearPct(fraccion: number, decimales = 1): string {
  return `${(fraccion * 100).toFixed(decimales).replace(".", ",")} %`;
}

/** Decisión de mayor valor esperado para una evidencia en una modalidad. */
export function decisionOptima(evidencia: Evidencia, modo: ModalidadCaso): Accion {
  return accionOptima(posteriorBayes(EVIDENCIAS[evidencia].previo[modo]));
}

/** Por evidencia: casos, porcentaje que aisló el público, cuántas coincidieron con lo óptimo y cuántos estaban infectados. */
export function resumirEvidencias(rs: RespuestaDecision[], modo: ModalidadCaso): FilaEvidencia[] {
  return EVIDENCIAS_ORDEN.map((evidencia) => {
    const del = rs.filter((r) => r.evidencia === evidencia);
    const casos = del.length;
    const optima = decisionOptima(evidencia, modo);
    const previo = EVIDENCIAS[evidencia].previo[modo];
    const fraccion = (f: (r: RespuestaDecision) => boolean) => (casos === 0 ? null : del.filter(f).length / casos);
    return {
      evidencia,
      etiqueta: EVIDENCIAS[evidencia].etiqueta,
      previo,
      posterior: posteriorBayes(previo),
      optima,
      casos,
      pctAislo: fraccion((r) => r.decision === "aislar"),
      pctOptimas: fraccion((r) => r.decision === optima),
      pctInfectados: fraccion((r) => r.estabaInfectado),
    };
  });
}

/** Totales de la modalidad, sobre las respuestas con evidencia conocida. */
export function totalDecisiones(rs: RespuestaDecision[], modo: ModalidadCaso): {
  casos: number;
  pctAislo: number | null;
  pctOptimas: number | null;
} {
  const con = rs.filter((r): r is RespuestaDecision & { evidencia: Evidencia } => r.evidencia !== null);
  const casos = con.length;
  if (casos === 0) return { casos, pctAislo: null, pctOptimas: null };
  return {
    casos,
    pctAislo: con.filter((r) => r.decision === "aislar").length / casos,
    pctOptimas: con.filter((r) => r.decision === decisionOptima(r.evidencia, modo)).length / casos,
  };
}

/**
 * Lectura automática de una modalidad (1 a 2 líneas). Señala la evidencia con mayor desvío
 * respecto de la decisión óptima, si supera PUNTOS_DESVIO; si no, dice que el público se acercó.
 */
export function interpretarDecisiones(
  filas: FilaEvidencia[],
  total: { casos: number; pctOptimas: number | null },
): string[] {
  if (total.casos === 0 || total.pctOptimas === null) {
    return ["Sin decisiones registradas en esta modalidad todavía."];
  }
  const desvios = filas
    .flatMap((f) => (f.casos > 0 && f.pctAislo !== null ? [{ f, dif: f.pctAislo - (f.optima === "aislar" ? 1 : 0) }] : []))
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif));
  const peor = desvios[0];
  const lineas: string[] = [];
  if (peor && Math.abs(peor.dif) * 100 >= PUNTOS_DESVIO) {
    const { f, dif } = peor;
    const optimo = f.optima === "aislar" ? 100 : 0;
    const a = `a los pacientes ${DESCRIPCION_EVIDENCIA[f.evidencia]}`;
    lineas.push(
      dif > 0
        ? `El público aisló de más ${a}: ${formatearPct(f.pctAislo!, 0)} vs óptimo ${optimo} %.`
        : `El público liberó de más ${a}: aisló ${formatearPct(f.pctAislo!, 0)} vs óptimo ${optimo} %.`,
    );
  } else {
    lineas.push("El público se acercó a la decisión óptima en todas las evidencias.");
  }
  lineas.push(
    `En total, ${formatearPct(total.pctOptimas, 0)} de las ${total.casos} decisiones coincidió con la óptima.`,
  );
  return lineas;
}

/** Tabla 2x2 con frecuencias naturales de 1000 personas para la modalidad. */
export function frecuenciasDeModo(modo: ModalidadCaso): Frecuencias & { prevalencia: number } {
  const prevalencia = modo === "experto" ? PREVALENCIA_EXPERTO : PREVALENCIA;
  return { prevalencia, ...frecuenciasNaturales(N_CIUDAD, prevalencia, SENSIBILIDAD, ESPECIFICIDAD) };
}

/** Texto del umbral y los costos, derivado de las constantes del juego. */
export function textoUmbral(): string {
  return `Aislar a una persona sana cuesta ${COSTO_AISLAR_SANO}; liberar a una persona infectada cuesta ${COSTO_LIBERAR_ENFERMO}. Por eso conviene aislar cuando la probabilidad de estar infectado supera ${Math.round(UMBRAL_DECISION * 100)} %.`;
}
