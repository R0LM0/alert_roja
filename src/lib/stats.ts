/** Parámetros del escenario (catálogo, juegos 24 y 39). */
export const PREVALENCIA = 0.1;
export const SENSIBILIDAD = 0.9;
export const ESPECIFICIDAD = 0.8;
export const N_CIUDAD = 1000;
export const PACIENTES_POR_RONDA = 10;

export type Frecuencias = { vp: number; fp: number; fn: number; vn: number };

/** Tabla 2x2 con frecuencias naturales para una población de n personas. */
export function frecuenciasNaturales(
  n = N_CIUDAD,
  prev = PREVALENCIA,
  sens = SENSIBILIDAD,
  esp = ESPECIFICIDAD,
): Frecuencias {
  const infectados = Math.round(n * prev);
  const sanos = n - infectados;
  const vp = Math.round(infectados * sens);
  const vn = Math.round(sanos * esp);
  return { vp, fp: sanos - vn, fn: infectados - vp, vn };
}

/** Teorema de Bayes: P(infectado | positivo). */
export function vppBayes(prev = PREVALENCIA, sens = SENSIBILIDAD, esp = ESPECIFICIDAD): number {
  const num = sens * prev;
  const den = num + (1 - esp) * (1 - prev);
  return den === 0 ? 0 : num / den;
}

/** P(sano | negativo). */
export function vpnBayes(prev = PREVALENCIA, sens = SENSIBILIDAD, esp = ESPECIFICIDAD): number {
  const num = esp * (1 - prev);
  const den = num + (1 - sens) * prev;
  return den === 0 ? 0 : num / den;
}

export type Respuesta = {
  estimacion_pct: number;
  decision: "aislar" | "liberar";
  estaba_infectado: boolean;
};

export type Resumen = {
  n: number;
  estimacionPromedioPct: number | null;
  vppObservadoPct: number | null;
  vppTeoricoPct: number;
  pctSobreestiman: number | null;
  pctAislados: number | null;
  aisladosSanos: number;
  liberadosInfectados: number;
};

/** Resume las respuestas del público. Todos los pacientes mostrados dieron positivo. */
export function resumir(rs: Respuesta[], prev = PREVALENCIA): Resumen {
  const vppTeorico = vppBayes(prev) * 100;
  const n = rs.length;
  if (n === 0) {
    return {
      n,
      estimacionPromedioPct: null,
      vppObservadoPct: null,
      vppTeoricoPct: vppTeorico,
      pctSobreestiman: null,
      pctAislados: null,
      aisladosSanos: 0,
      liberadosInfectados: 0,
    };
  }
  const suma = rs.reduce((a, r) => a + r.estimacion_pct, 0);
  const infectados = rs.filter((r) => r.estaba_infectado).length;
  const sobre = rs.filter((r) => r.estimacion_pct > vppTeorico).length;
  const aislados = rs.filter((r) => r.decision === "aislar").length;
  return {
    n,
    estimacionPromedioPct: suma / n,
    vppObservadoPct: (infectados / n) * 100,
    vppTeoricoPct: vppTeorico,
    pctSobreestiman: (sobre / n) * 100,
    pctAislados: (aislados / n) * 100,
    aisladosSanos: rs.filter((r) => r.decision === "aislar" && !r.estaba_infectado).length,
    liberadosInfectados: rs.filter((r) => r.decision === "liberar" && r.estaba_infectado).length,
  };
}

/** Sortea un paciente que dio positivo: infectado con probabilidad = VPP. */
export function sortearPositivo(rand: () => number = Math.random): { infectado: boolean } {
  return { infectado: rand() < vppBayes() };
}
