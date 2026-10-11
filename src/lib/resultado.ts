import { formatearPct } from "./formula-bayes";
import { prevalenciaDeModo, type Modo } from "./ronda";
import {
  BONO_DECISION,
  PACIENTES_POR_RONDA,
  SENSIBILIDAD,
  decisionAcertada,
  frecuenciasNaturales,
  insignias,
  puntajePartida,
  puntajeRespuesta,
  vppBayes,
  type Frecuencias,
  type Insignia,
  type Respuesta,
} from "./stats";

/** Fracción del puntaje máximo posible desde la que se festeja. */
export const UMBRAL_PUNTAJE_ALTO = 0.75;

/** Máximo posible: estimación perfecta (100) + bono de decisión en cada paciente. */
export function puntajeMaximo(): number {
  return PACIENTES_POR_RONDA * (100 + BONO_DECISION);
}

export type InsigniaInfo = { id: Insignia; titulo: string; descripcion: string; icono: "brain" | "shield-alert" | "smile" };

const INSIGNIAS: Record<Insignia, InsigniaInfo> = {
  "bayesiano-nato": {
    id: "bayesiano-nato",
    titulo: "Bayesiano nato",
    descripcion: "Tu estimación promedio quedó entre 25 % y 40 %, cerca de la realidad.",
    icono: "brain",
  },
  paranoico: {
    id: "paranoico",
    titulo: "Paranoico",
    descripcion: "Aislaste a los 10 pacientes, sin excepción.",
    icono: "shield-alert",
  },
  confiado: {
    id: "confiado",
    titulo: "Confiado",
    descripcion: "Liberaste a los 10 pacientes, sin excepción.",
    icono: "smile",
  },
};

export type EntradaResultado = {
  modo: Modo;
  ronda: { orden: number; nombre: string }[];
  respuestas: (Respuesta & { orden: number })[];
  /** Puntaje calculado por el servidor, si ya se guardó. */
  puntajeServidor?: number;
};

export type FilaPaciente = {
  orden: number;
  nombre: string;
  estimacionPct: number;
  decision: Respuesta["decision"];
  estaba_infectado: boolean;
  puntajeEstimacion: number;
  bonoDecision: number;
  puntaje: number;
  decisionAcertada: boolean;
};

export type ResultadoCalculado = {
  prevalencia: number;
  vppTeoricoPct: number;
  estimacionPromedioPct: number;
  filas: FilaPaciente[];
  puntajeTotal: number;
  infectadosEnRonda: number;
  frecuencias: Frecuencias;
  insignias: InsigniaInfo[];
  esPuntajeAlto: boolean;
  mensajeClave: string;
};

/** Todo lo que muestra /resultado; los componentes solo pintan estos valores. */
export function calcularResultado({ modo, ronda, respuestas, puntajeServidor }: EntradaResultado): ResultadoCalculado {
  const prevalencia = prevalenciaDeModo(modo);
  const vpp = vppBayes(prevalencia);
  const vppPct = vpp * 100;
  const nombres = new Map(ronda.map((p) => [p.orden, p.nombre]));

  const filas = respuestas.map<FilaPaciente>((r) => {
    const acierto = decisionAcertada(r);
    const puntajeEstimacion = puntajeRespuesta(r.estimacion_pct, vppPct);
    const bonoDecision = acierto ? BONO_DECISION : 0;
    return {
      orden: r.orden,
      nombre: nombres.get(r.orden) ?? `Paciente ${r.orden}`,
      estimacionPct: r.estimacion_pct,
      decision: r.decision,
      estaba_infectado: r.estaba_infectado,
      puntajeEstimacion,
      bonoDecision,
      puntaje: puntajeEstimacion + bonoDecision,
      decisionAcertada: acierto,
    };
  });

  // Si el servidor ya calculó el puntaje, se muestra ese (fuente de verdad); debe coincidir con puntajePartida.
  const puntajeTotal = puntajeServidor ?? puntajePartida(respuestas, prevalencia);
  const n = respuestas.length;
  const porCada = Math.round(1 / vpp);

  return {
    prevalencia,
    vppTeoricoPct: vppPct,
    estimacionPromedioPct: n === 0 ? 0 : respuestas.reduce((a, r) => a + r.estimacion_pct, 0) / n,
    filas,
    puntajeTotal,
    infectadosEnRonda: respuestas.filter((r) => r.estaba_infectado).length,
    frecuencias: frecuenciasNaturales(undefined, prevalencia),
    insignias: insignias(respuestas, prevalencia).map((id) => INSIGNIAS[id]),
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
