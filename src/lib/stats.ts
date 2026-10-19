import { EVIDENCIAS, accionOptima, posteriorBayes, puntosPorDecision, type Evidencia, type ModalidadCaso } from "./caso-bayesiano";

/** Parámetros del escenario (catálogo, juegos 24 y 39). */
export const PREVALENCIA = 0.1;
export const SENSIBILIDAD = 0.9;
export const ESPECIFICIDAD = 0.8;
export const N_CIUDAD = 1000;
export const PACIENTES_POR_RONDA = 10;
/** Modo experto: prevalencia 1 %. */
export const PREVALENCIA_EXPERTO = 0.01;

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
  estimacion_pct: number | null;
  decision: "aislar" | "liberar";
  estaba_infectado: boolean;
  /** Milisegundos que el jugador tardó en el paciente; ausente en filas sin tiempo. */
  tiempo_ms?: number;
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
  const estimaciones = rs.flatMap((r) => r.estimacion_pct === null ? [] : [r.estimacion_pct]);
  const suma = estimaciones.reduce((a, pct) => a + pct, 0);
  const infectados = rs.filter((r) => r.estaba_infectado).length;
  const sobre = estimaciones.filter((pct) => pct > vppTeorico).length;
  const aislados = rs.filter((r) => r.decision === "aislar").length;
  return {
    n,
    estimacionPromedioPct: estimaciones.length ? suma / estimaciones.length : null,
    vppObservadoPct: (infectados / n) * 100,
    vppTeoricoPct: vppTeorico,
    pctSobreestiman: estimaciones.length ? (sobre / estimaciones.length) * 100 : null,
    pctAislados: (aislados / n) * 100,
    aisladosSanos: rs.filter((r) => r.decision === "aislar" && !r.estaba_infectado).length,
    liberadosInfectados: rs.filter((r) => r.decision === "liberar" && r.estaba_infectado).length,
  };
}

/** Sortea un paciente que dio positivo: infectado con probabilidad = VPP. */
export function sortearPositivo(
  rand: () => number = Math.random,
  prev = PREVALENCIA,
): { infectado: boolean } {
  return { infectado: rand() < vppBayes(prev) };
}

/** Puntos por una estimación: 100 menos el error absoluto (en puntos porcentuales), mínimo 0. */
export function puntajeRespuesta(estimacionPct: number, vppPct: number): number {
  return Math.max(0, Math.round(100 - Math.abs(estimacionPct - vppPct)));
}

/** La decisión acierta si aísla a un infectado o libera a un sano. */
export function decisionAcertada(r: Respuesta): boolean {
  return (r.decision === "aislar") === r.estaba_infectado;
}

type ContextoDecision = {
  modo: ModalidadCaso;
  ronda: readonly { orden: number; evidencia?: Evidencia }[];
};

function modoDeContexto(contexto: ContextoDecision | number): ModalidadCaso {
  if (typeof contexto !== "number") return contexto.modo;
  return contexto === PREVALENCIA_EXPERTO ? "experto" : "normal";
}

/** Una evidencia ausente (filas antiguas) usa sin antecedentes. El argumento numérico sigue admitiendo llamadas legacy. */
export function puntajePartida(rs: Respuesta[], contexto: ContextoDecision | number = PREVALENCIA): number {
  const modo = modoDeContexto(contexto);
  const porOrden = typeof contexto === "number" ? null : new Map(contexto.ronda.map((p) => [p.orden, p.evidencia]));
  return rs.reduce((total, r, i) => {
    const orden = "orden" in r && typeof r.orden === "number" ? r.orden : i + 1;
    const evidencia = porOrden?.get(orden) ?? "sin-antecedentes";
    return total + puntosPorDecision(r.decision, posteriorBayes(EVIDENCIAS[evidencia].previo[modo]));
  }, 0);
}

export type Insignia =
  | "perfecto"
  | "ojo-clinico"
  | "cazador"
  | "bayesiano-nato"
  | "experto"
  | "rayo"
  | "sin-panico";

/** Rayo: la suma de los tiempos de la ronda queda por debajo de este límite (1 minuto). */
export const TIEMPO_RAYO_MS = 60_000;
/** Experto: decisiones de mayor valor esperado necesarias en modo experto. */
export const ACIERTOS_EXPERTO = 7;

/** Poca evidencia: tras el positivo, la probabilidad no llega al umbral para aislar. */
function evidenciaBaja(evidencia: Evidencia, modo: ModalidadCaso): boolean {
  return accionOptima(posteriorBayes(EVIDENCIAS[evidencia].previo[modo])) === "liberar";
}

/** Sin pánico: ningún sano de poca evidencia aislado, y la ronda tuvo al menos uno de esos pacientes. */
function sinPanico(rs: Respuesta[], contexto: ContextoDecision | number): boolean {
  if (typeof contexto === "number") return false;
  const porOrden = new Map(contexto.ronda.map((p) => [p.orden, p.evidencia]));
  const bajos = rs.flatMap((r, i) => {
    const evidencia = porOrden.get("orden" in r && typeof r.orden === "number" ? r.orden : i + 1);
    return evidencia && evidenciaBaja(evidencia, contexto.modo) ? [r] : [];
  });
  return bajos.length > 0 && bajos.every((r) => !(r.decision === "aislar" && !r.estaba_infectado));
}

/** Rayo exige tiempo en cada paciente; las filas sin tiempo no pueden ganarla. */
function rapida(rs: Respuesta[]): boolean {
  if (!rs.every((r) => r.tiempo_ms !== undefined)) return false;
  return rs.reduce((total, r) => total + (r.tiempo_ms ?? 0), 0) < TIEMPO_RAYO_MS;
}

/** Insignias de decisión para rondas completas; la de estimación sobrevive solo en filas legacy. */
export function insignias(rs: Respuesta[], contexto: ContextoDecision | number = PREVALENCIA): Insignia[] {
  if (rs.length === 0) return [];
  const out: Insignia[] = [];
  if (rs.length === PACIENTES_POR_RONDA) {
    const aciertos = puntajePartida(rs, contexto);
    if (aciertos === PACIENTES_POR_RONDA) out.push("perfecto");
    else if (aciertos >= 8) out.push("ojo-clinico");
    const infectados = rs.filter((r) => r.estaba_infectado);
    if (infectados.length > 0 && infectados.every((r) => r.decision === "aislar")) out.push("cazador");
    if (modoDeContexto(contexto) === "experto" && aciertos >= ACIERTOS_EXPERTO) out.push("experto");
    if (rapida(rs)) out.push("rayo");
    if (sinPanico(rs, contexto)) out.push("sin-panico");
  }
  const estimaciones = rs.flatMap((r) => r.estimacion_pct === null ? [] : [r.estimacion_pct]);
  if (estimaciones.length) {
    const promedio = estimaciones.reduce((a, e) => a + e, 0) / estimaciones.length;
    if (promedio >= 25 && promedio <= 40) out.push("bayesiano-nato");
  }
  return out;
}
