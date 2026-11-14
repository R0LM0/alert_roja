// Monitor del médico en el escritorio del consultorio 3D (/jugar).
// La pantalla es decorativa y NUNCA muestra la verdad de la infección ni
// probabilidades: todo paciente da POSITIVO en el juego, así el resultado
// fijo no filtra información.

export const ENCABEZADO_MONITOR = "Laboratorio · Prueba rápida";
export const RESULTADO_MONITOR = "POSITIVO";

/** Largo máximo del nombre en pantalla; más largo se recorta con puntos suspensivos. */
const LARGO_NOMBRE = 28;

export type LineasMonitor = {
  encabezado: string;
  paciente: string;
  resultado: string;
};

/** Recorta un nombre largo para que quepa en la pantalla. */
function recortar(texto: string): string {
  return texto.length > LARGO_NOMBRE ? `${texto.slice(0, LARGO_NOMBRE - 1)}…` : texto;
}

/**
 * Textos de la pantalla. Solo el nombre del paciente varía entre turnos:
 * el resto es fijo y no depende del caso.
 */
export function lineasMonitor(nombrePaciente?: string): LineasMonitor {
  const nombre = nombrePaciente?.trim();
  return {
    encabezado: ENCABEZADO_MONITOR,
    paciente: `Paciente: ${nombre ? recortar(nombre) : "—"}`,
    resultado: `Resultado: ${RESULTADO_MONITOR}`,
  };
}

/** Palabras que delatan la verdad del caso o una probabilidad: no deben salir en pantalla. */
export const PALABRAS_PROHIBIDAS =
  /infect|contagi|enferm|\bsanos?\b|\bsanas?\b|portador|virus|probab|prevalen|sensibil|especific|verdader|falso|bayes|riesgo|%/i;

/** Posición y giro del monitor sobre el escritorio (unidades de escena). */
export const POS_MONITOR: [number, number, number] = [0.5, 0.76, 0.86];
/** Giro en Y: la pantalla queda a unos 25° hacia la cámara, sin tapar al paciente. */
export const GIRO_MONITOR_Y = -0.45;

/** En pantallas verticales (celular) el encuadre es angosto: el monitor se acerca al centro y se achica para no cortarse. */
export function colocacionMonitor(aspecto: number): { posicion: [number, number, number]; escala: number } {
  if (aspecto >= 1) return { posicion: POS_MONITOR, escala: 1 };
  return { posicion: [0.25, 0.76, 1.05], escala: 0.5 };
}

/** Texto mientras la prueba "se procesa"; decorativo, igual para todo paciente. */
export const TEXTO_ANALIZANDO = "Analizando muestra";
/** Tiempo de la barra de análisis antes de mostrar el resultado. */
export const DURACION_ANALISIS_MS = 1800;
/** Una pasada completa del trazo del ECG por la pantalla. */
export const PERIODO_BARRIDO_MS = 2400;
/** Redibujo a ~12 cuadros por segundo: suficiente para la pantalla y liviano en celulares. */
export const INTERVALO_MONITOR_MS = 80;
const MEDIO_PARPADEO_MS = 500;

export type EstadoMonitor = {
  fase: "analizando" | "listo";
  /** Avance de la barra de análisis, 0..1. */
  progreso: number;
  /** Posición de la cabeza del trazo, 0..1; `null` = trazo completo y quieto. */
  barrido: number | null;
  /** Pasadas completas ya hechas: en la primera aún no hay trazo viejo por delante. */
  vueltas: number;
  cursor: boolean;
};

/**
 * Estado de la animación a `tMs` desde que cambió el paciente. Depende solo del
 * tiempo, nunca del caso. Con movimiento reducido es la pantalla final, estática.
 */
export function estadoMonitor(tMs: number, reducido = false): EstadoMonitor {
  if (reducido) return { fase: "listo", progreso: 1, barrido: null, vueltas: 0, cursor: false };
  const t = Math.max(tMs, 0);
  const progreso = Math.min(t / DURACION_ANALISIS_MS, 1);
  return {
    fase: progreso < 1 ? "analizando" : "listo",
    progreso,
    barrido: (t % PERIODO_BARRIDO_MS) / PERIODO_BARRIDO_MS,
    vueltas: Math.floor(t / PERIODO_BARRIDO_MS),
    cursor: Math.floor(t / MEDIO_PARPADEO_MS) % 2 === 0,
  };
}

const LATIDOS_ECG = 3;
/** Un latido del ECG en coordenadas normalizadas [x 0..1, y -1..1]. */
const LATIDO_ECG: [number, number][] = [
  [0, 0], [0.2, 0], [0.25, 0.15], [0.3, -0.12], [0.36, 1], [0.42, -0.3],
  [0.47, 0], [0.6, 0], [0.68, 0.22], [0.74, 0], [1, 0],
];

/** Vértices del trazo completo: [avance 0..1 a lo ancho de la pantalla, altura -1..1]. */
export const PUNTOS_ECG: [number, number][] = Array.from({ length: LATIDOS_ECG }, (_, latido) =>
  LATIDO_ECG.map(([x, y]): [number, number] => [(latido + x) / LATIDOS_ECG, y]),
).flat();

/** Altura del trazo en `avance` (0..1); fuera de ese rango, la línea base. */
export function alturaEcg(avance: number): number {
  if (avance <= 0 || avance >= 1) return 0;
  const i = PUNTOS_ECG.findIndex(([x]) => x >= avance);
  const [x0, y0] = PUNTOS_ECG[i - 1];
  const [x1, y1] = PUNTOS_ECG[i];
  return x1 === x0 ? y1 : y0 + ((y1 - y0) * (avance - x0)) / (x1 - x0);
}
