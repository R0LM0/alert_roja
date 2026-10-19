import { EVIDENCIAS, accionOptima, posteriorBayes, puntosPorDecision, type Evidencia, type ModalidadCaso } from "./caso-bayesiano";

/** Agregado de decisiones del público por tipo de evidencia (panel "¿Qué decidió el público?"). Sin React. */

export type Decision = "aislar" | "liberar";

/** Una decisión del jugador: la evidencia que vio, lo que decidió y si el paciente estaba infectado. */
export type FilaDecision = { evidencia: Evidencia; decision: Decision; estaba_infectado: boolean };

/** Etiquetas cortas para el eje del gráfico (las largas de EVIDENCIAS no caben en el proyector). */
export const ETIQUETA_CORTA: Record<Evidencia, string> = {
  conviviente: "Conviviente",
  contacto: "Contacto estrecho",
  sintomas: "Síntomas",
  "sin-antecedentes": "Sin antecedentes",
  protegido: "Protegido",
};

export type AgregadoEvidencia = {
  evidencia: Evidencia;
  etiqueta: string;
  previoPct: number;
  posteriorPct: number;
  /** Acción de mayor valor esperado para esta evidencia en la modalidad. */
  optima: Decision;
  casos: number;
  /** % de pacientes con esta evidencia que el público aisló; null si no hubo casos. */
  aislaronPct: number | null;
};

export type ResumenDecisiones = {
  n: number;
  /** % de infectados entre los pacientes jugados (todos dieron positivo). */
  vppObservadoPct: number | null;
  /** % de decisiones que coinciden con la acción de mayor valor esperado. */
  decisionesOptimasPct: number | null;
  /** Una fila por evidencia, de menor a mayor probabilidad posterior. */
  porEvidencia: AgregadoEvidencia[];
};

/** Resume las decisiones de una modalidad. Las filas deben ser de esa modalidad (el panel filtra por prevalencia). */
export function resumirDecisiones(filas: FilaDecision[], modalidad: ModalidadCaso): ResumenDecisiones {
  const porEvidencia = (Object.keys(EVIDENCIAS) as Evidencia[])
    .map((evidencia): AgregadoEvidencia => {
      const previo = EVIDENCIAS[evidencia].previo[modalidad];
      const posterior = posteriorBayes(previo);
      const propias = filas.filter((f) => f.evidencia === evidencia);
      const aislaron = propias.filter((f) => f.decision === "aislar").length;
      return {
        evidencia,
        etiqueta: ETIQUETA_CORTA[evidencia],
        previoPct: previo * 100,
        posteriorPct: posterior * 100,
        optima: accionOptima(posterior),
        casos: propias.length,
        aislaronPct: propias.length === 0 ? null : (aislaron / propias.length) * 100,
      };
    })
    .sort((a, b) => a.posteriorPct - b.posteriorPct);

  const n = filas.length;
  const optimas = filas.reduce(
    (total, f) => total + puntosPorDecision(f.decision, posteriorBayes(EVIDENCIAS[f.evidencia].previo[modalidad])),
    0,
  );
  const infectados = filas.filter((f) => f.estaba_infectado).length;
  return {
    n,
    vppObservadoPct: n === 0 ? null : (infectados / n) * 100,
    decisionesOptimasPct: n === 0 ? null : (optimas / n) * 100,
    porEvidencia,
  };
}
