import { EVIDENCIAS, posteriorBayes, puntosPorDecision, type Evidencia } from "./caso-bayesiano";
import { formatearPct } from "./formula-bayes";
import { resolverInsignias, type InsigniaInfo } from "./insignias";
import { prevalenciaDeModo, type Modo } from "./ronda";
import {
  PACIENTES_POR_RONDA,
  SENSIBILIDAD,
  decisionAcertada,
  frecuenciasNaturales,
  insignias,
  vppBayes,
  type Frecuencias,
  type Respuesta,
} from "./stats";

/** Fracción del puntaje máximo posible desde la que se festeja (8 decisiones óptimas de 10). */
export const UMBRAL_PUNTAJE_ALTO = 0.8;

/** Máximo posible: una decisión de mayor valor esperado por paciente. */
export function puntajeMaximo(): number {
  return PACIENTES_POR_RONDA;
}

export type { InsigniaInfo } from "./insignias";

export type EntradaResultado = {
  modo: Modo;
  ronda: { orden: number; nombre: string; evidencia?: Evidencia }[];
  respuestas: (Respuesta & { orden: number })[];
  /** Puntaje calculado por el servidor, si ya se guardó. */
  puntajeServidor?: number;
};

export type FilaPaciente = {
  orden: number;
  nombre: string;
  estimacionPct: number | null;
  decision: Respuesta["decision"];
  estaba_infectado: boolean;
  evidencia: Evidencia;
  previo: number;
  posterior: number;
  puntos: 0 | 1;
  decisionAcertada: boolean;
};

export type ResultadoCalculado = {
  prevalencia: number;
  vppTeoricoPct: number;
  estimacionPromedioPct: number | null;
  filas: FilaPaciente[];
  puntajeTotal: number;
  infectadosEnRonda: number;
  frecuencias: Frecuencias;
  insignias: InsigniaInfo[];
  esPuntajeAlto: boolean;
  mensajeClave: string;
};

/** Todo lo que muestra /resultado; los componentes solo pintan estos valores. */
export function calcularResultado({ modo, ronda, respuestas }: EntradaResultado): ResultadoCalculado {
  const prevalencia = prevalenciaDeModo(modo);
  const vpp = vppBayes(prevalencia);
  const vppPct = vpp * 100;
  const pacientes = new Map(ronda.map((p) => [p.orden, p]));

  const filas = respuestas.map<FilaPaciente>((r) => {
    const paciente = pacientes.get(r.orden);
    const evidencia = paciente?.evidencia ?? "sin-antecedentes";
    const previo = EVIDENCIAS[evidencia].previo[modo];
    const posterior = posteriorBayes(previo);
    return {
      orden: r.orden,
      nombre: paciente?.nombre ?? `Paciente ${r.orden}`,
      estimacionPct: r.estimacion_pct,
      decision: r.decision,
      estaba_infectado: r.estaba_infectado,
      evidencia,
      previo,
      posterior,
      puntos: puntosPorDecision(r.decision, posterior),
      decisionAcertada: decisionAcertada(r),
    };
  });

  const estimaciones = respuestas.flatMap((r) => r.estimacion_pct === null ? [] : [r.estimacion_pct]);
  // El puntaje del servidor puede provenir de una versión previa sin evidencia;
  // /resultado siempre calcula la misma regla bayesiana que muestra por fila.
  const puntajeTotal = filas.reduce((total, fila) => total + fila.puntos, 0);
  const porCada = Math.round(1 / vpp);

  return {
    prevalencia,
    vppTeoricoPct: vppPct,
    estimacionPromedioPct: estimaciones.length ? estimaciones.reduce((a, pct) => a + pct, 0) / estimaciones.length : null,
    filas,
    puntajeTotal,
    infectadosEnRonda: respuestas.filter((r) => r.estaba_infectado).length,
    frecuencias: frecuenciasNaturales(undefined, prevalencia),
    insignias: resolverInsignias(insignias(respuestas, { modo, ronda })),
    esPuntajeAlto: puntajeTotal >= puntajeMaximo() * UMBRAL_PUNTAJE_ALTO,
    mensajeClave: `La prueba acierta ${formatearPct(SENSIBILIDAD * 100, 0)}, pero solo 1 de cada ${porCada} positivos está enfermo`,
  };
}

export type GrupoPunto = "VP" | "FP" | "FN" | "VN";
export type PuntoCiudad = { grupo: GrupoPunto; mezclado: { x: number; y: number }; agrupado: { x: number; y: number } };

const COLUMNAS = 40;
const FILAS_MEZCLA = 25;
const COLS_IZQ = 12; // columna "positivos"; después 1 columna de separación y 27 de "negativos"
const COLS_DER = COLUMNAS - COLS_IZQ - 1;

/**
 * Posiciones de los puntos de la animación 2D: una mezcla determinista y el reagrupado en la
 * tabla 2x2 (izquierda positivos: VP arriba, FP abajo; derecha negativos: FN arriba, VN abajo).
 */
export function distribuirPuntos(f: Frecuencias): { puntos: PuntoCiudad[]; columnas: number; filas: number } {
  const bloque = (n: number, ancho: number, x0: number, y0: number) =>
    Array.from({ length: n }, (_, i) => ({ x: x0 + (i % ancho), y: y0 + Math.floor(i / ancho) }));
  const filasDe = (n: number, ancho: number) => Math.ceil(n / ancho);

  const yFP = filasDe(f.vp, COLS_IZQ) + 1;
  const yVN = filasDe(f.fn, COLS_DER) + 1;
  const xDer = COLS_IZQ + 1;
  const agrupados = [
    ...bloque(f.vp, COLS_IZQ, 0, 0).map((p) => ({ grupo: "VP" as const, p })),
    ...bloque(f.fp, COLS_IZQ, 0, yFP).map((p) => ({ grupo: "FP" as const, p })),
    ...bloque(f.fn, COLS_DER, xDer, 0).map((p) => ({ grupo: "FN" as const, p })),
    ...bloque(f.vn, COLS_DER, xDer, yVN).map((p) => ({ grupo: "VN" as const, p })),
  ];
  const filas = Math.max(FILAS_MEZCLA, yFP + filasDe(f.fp, COLS_IZQ), yVN + filasDe(f.vn, COLS_DER));
  const total = agrupados.length;

  // 397 es coprimo con 1000: permutación fija de las celdas de la cuadrícula de mezcla.
  const puntos = agrupados.map(({ grupo, p }, i) => {
    const celda = (i * 397) % total;
    return { grupo, agrupado: p, mezclado: { x: celda % COLUMNAS, y: Math.floor(celda / COLUMNAS) } };
  });
  return { puntos, columnas: COLUMNAS, filas };
}
