import { EVIDENCIAS, UMBRAL_DECISION, accionOptima, type Evidencia } from "./caso-bayesiano";
import { formatearPct } from "./formula-bayes";
import { prevalenciaDeModo, type Modo } from "./ronda";
import { ESPECIFICIDAD, N_CIUDAD, SENSIBILIDAD, frecuenciasNaturales } from "./stats";
import type { FilaPaciente } from "./resultado";

const FRASE_EVIDENCIA: Record<Evidencia, string> = {
  conviviente: "Con un conviviente con caso",
  contacto: "Con contacto estrecho",
  sintomas: "Con síntomas compatibles",
  "sin-antecedentes": "Sin antecedentes",
  protegido: "Con protección (vacunado o con mascarilla)",
};

export type Accion = "aislar" | "liberar";

export type ExplicacionPaciente = {
  orden: number;
  nombre: string;
  etiquetaEvidencia: string;
  decision: Accion;
  optima: Accion;
  acerto: boolean;
  infectado: boolean;
  /** Una frase: evidencia, probabilidad tras el positivo y qué convenía hacer. */
  razon: string;
};

/** Lectura en español de una fila de /resultado: qué pasó, qué convenía y por qué. */
export function explicacionPaciente(f: FilaPaciente): ExplicacionPaciente {
  const optima = accionOptima(f.posterior);
  const acerto = f.puntos === 1;
  const posterior = formatearPct(f.posterior * 100, 1);
  const conclusion = acerto ? `convenía ${optima}.` : `convenía ${optima}, no ${f.decision}.`;
  return {
    orden: f.orden,
    nombre: f.nombre,
    etiquetaEvidencia: EVIDENCIAS[f.evidencia].etiqueta,
    decision: f.decision,
    optima,
    acerto,
    infectado: f.estaba_infectado,
    razon: `${FRASE_EVIDENCIA[f.evidencia]}, la probabilidad de estar infectado queda en ${posterior}, ${conclusion}`,
  };
}

export type ExplicacionFrecuencias = {
  poblacion: number;
  enfermos: number;
  enfermosPositivos: number;
  sanos: number;
  sanosPositivos: number;
  positivos: number;
  /** "1 de cada N" de los positivos que están enfermos. */
  porCada: number;
  sensibilidadTexto: string;
  falsoPositivoTexto: string;
  /** Pasos ya redactados; el componente solo los numera. */
  pasos: string[];
};

/** Frecuencias naturales de la modalidad: cuántas personas caen en cada casilla de 1000. */
export function explicacionFrecuencias(modo: Modo): ExplicacionFrecuencias {
  const f = frecuenciasNaturales(N_CIUDAD, prevalenciaDeModo(modo));
  const enfermos = f.vp + f.fn;
  const sanos = f.fp + f.vn;
  const positivos = f.vp + f.fp;
  const porCada = Math.round(positivos / f.vp);
  const sensibilidadTexto = formatearPct(SENSIBILIDAD * 100, 0);
  const falsoPositivoTexto = formatearPct((1 - ESPECIFICIDAD) * 100, 0);
  return {
    poblacion: N_CIUDAD,
    enfermos,
    enfermosPositivos: f.vp,
    sanos,
    sanosPositivos: f.fp,
    positivos,
    porCada,
    sensibilidadTexto,
    falsoPositivoTexto,
    pasos: [
      `De ${N_CIUDAD} personas, ${enfermos} están enfermas.`,
      `La prueba acierta ${sensibilidadTexto}: ${f.vp} de esas ${enfermos} dan positivo.`,
      `De ${sanos} sanas, ${falsoPositivoTexto} dan positivo por error: son ${f.fp}.`,
      `En total dan positivo ${f.vp} + ${f.fp} = ${positivos} personas.`,
      `Solo ${f.vp} de esos ${positivos} positivos están enfermos: 1 de cada ${porCada}.`,
    ],
  };
}

/** Umbral de decisión en texto, p. ej. "25 %". */
export const UMBRAL_TEXTO = formatearPct(UMBRAL_DECISION * 100, 0);
