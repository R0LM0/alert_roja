import { vppBayes } from "@/lib/stats";

export type Evidencia = "conviviente" | "contacto" | "sintomas" | "sin-antecedentes" | "protegido";
export type ModalidadCaso = "normal" | "experto";

export const EVIDENCIAS: Record<Evidencia, { etiqueta: string; previo: Record<ModalidadCaso, number> }> = {
  conviviente: { etiqueta: "Conviviente con caso", previo: { normal: 0.4, experto: 0.1 } },
  contacto: { etiqueta: "Contacto estrecho", previo: { normal: 0.25, experto: 0.05 } },
  sintomas: { etiqueta: "Síntomas compatibles", previo: { normal: 0.18, experto: 0.03 } },
  "sin-antecedentes": { etiqueta: "Sin antecedentes", previo: { normal: 0.1, experto: 0.01 } },
  protegido: { etiqueta: "Protegido (vacunado o con mascarilla)", previo: { normal: 0.04, experto: 0.005 } },
};

export const COSTO_AISLAR_SANO = 1;
export const COSTO_LIBERAR_ENFERMO = 3;
export const UMBRAL_DECISION = COSTO_AISLAR_SANO / (COSTO_AISLAR_SANO + COSTO_LIBERAR_ENFERMO);

export function posteriorBayes(previo: number): number {
  return vppBayes(previo);
}

/** En el empate exacto ambas acciones valen lo mismo; elegimos liberar. */
export function accionOptima(posterior: number): "aislar" | "liberar" {
  return posterior > UMBRAL_DECISION ? "aislar" : "liberar";
}

export function valorEsperado(accion: "aislar" | "liberar", posterior: number): number {
  return accion === "aislar"
    ? -COSTO_AISLAR_SANO * (1 - posterior)
    : -COSTO_LIBERAR_ENFERMO * posterior;
}

export function puntosPorDecision(accion: "aislar" | "liberar", posterior: number): 0 | 1 {
  return accion === accionOptima(posterior) ? 1 : 0;
}

/** Puntaje del servidor: refleja la lectura bayesiana por paciente de /resultado. */
export function puntajeDeRespuestas(
  respuestas: { evidencia: Evidencia; decision: "aislar" | "liberar" }[],
  modalidad: ModalidadCaso,
): number {
  return respuestas.reduce((total, { evidencia, decision }) =>
    total + puntosPorDecision(decision, posteriorBayes(EVIDENCIAS[evidencia].previo[modalidad])), 0);
}

/** FNV-1a de 32 bits, el mismo hash determinista usado para derivar el avatar. */
function hashSemilla(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return hash;
}

/** Mezcla con sales independientes, como indiceSemilla en paciente3d; resultado unsigned de 32 bits. */
function hashConSal(hash: number, sal: number): number {
  let valor = Math.imul(hash ^ sal, 0x45d9f3b);
  valor = Math.imul(valor ^ (valor >>> 16), 0x45d9f3b);
  return (valor ^ (valor >>> 16)) >>> 0;
}

const TIPOS_EVIDENCIA: Evidencia[] = ["conviviente", "contacto", "sintomas", "sin-antecedentes", "protegido"];

/** Cada positivo se infecta con probabilidad posterior, nunca con el previo. */
export function casoDePaciente(seed: string, modalidad: ModalidadCaso): {
  evidencia: Evidencia;
  previo: number;
  posterior: number;
  infectado: boolean;
} {
  const hash = hashSemilla(seed);
  const evidencia = TIPOS_EVIDENCIA[hashConSal(hash, 1) % TIPOS_EVIDENCIA.length];
  const previo = EVIDENCIAS[evidencia].previo[modalidad];
  const posterior = posteriorBayes(previo);
  const infectado = hashConSal(hash, 2) / 4294967296 < posterior;
  return { evidencia, previo, posterior, infectado };
}
