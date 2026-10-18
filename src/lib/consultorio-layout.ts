// Lógica pura de reparto para el Consultorio (escena animada de /jugar).
// La UI no decide tiempos ni posiciones: recibe el plan de capas y lo pinta.
// Igual que ciudad-layout: el lienzo lógico es compartido y las pruebas
// fijan los invariantes (orden, escalonado, sin solapes, movimiento reducido).

/** Identificadores de las capas de la escena, en el orden en que se arman (S2). */
export type CapaId =
  | "pared"
  | "piso"
  | "escritorio"
  | "camas"
  | "sala-espera"
  | "puerta";

/** Rectángulo de una capa, en porcentajes del lienzo (0..100). */
export interface CapaEscena {
  id: CapaId;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Retardo de entrada en ms para el armado escalonado (S2). */
  retardoMs: number;
}

/** Orden del armado: el fondo primero, la puerta al final (los pacientes entran por ahí). */
export const ORDEN_ENSAMBLADO: readonly CapaId[] = [
  "pared",
  "piso",
  "escritorio",
  "camas",
  "sala-espera",
  "puerta",
] as const;

/** Separación entre entradas de capas consecutivas: el armado cruza ~2 s (S13). */
export const ESCALON_MS = 300;

/** Duración de la entrada de cada capa. Última capa: 5×300 + 500 = 2000 ms. */
export const DURACION_ENTRADA_MS = 500;

/** Línea del piso: todo lo que está apoyado termina exactamente acá. */
const LINEA_PISO = 58;

/**
 * Geometría de la escena en un lienzo vertical (mobile-first). La puerta y la sala
 * de espera viven en la pared y apoyan en la línea del piso; escritorio y camas
 * viven en el piso, sin solaparse.
 */
const GEOMETRIA: Omit<CapaEscena, "retardoMs">[] = [
  { id: "pared", x: 0, y: 0, ancho: 100, alto: LINEA_PISO },
  { id: "piso", x: 0, y: LINEA_PISO, ancho: 100, alto: 100 - LINEA_PISO },
  { id: "escritorio", x: 58, y: 66, ancho: 36, alto: 18 },
  { id: "camas", x: 4, y: 62, ancho: 46, alto: 34 },
  { id: "sala-espera", x: 6, y: 18, ancho: 40, alto: LINEA_PISO - 18 },
  { id: "puerta", x: 66, y: 12, ancho: 20, alto: LINEA_PISO - 12 },
];

/** Duración total del armado en ms (0 con movimiento reducido: estado final directo). */
export function duracionEnsamblado(reducido: boolean): number {
  if (reducido) return 0;
  return (ORDEN_ENSAMBLADO.length - 1) * ESCALON_MS + DURACION_ENTRADA_MS;
}
/**
 * Plan de armado de la escena. Con movimiento reducido (S9) no hay escalonado:
 * todas las capas entran juntas y el estado final se muestra de una.
 */
export function planEnsamblado(reducido: boolean): CapaEscena[] {
  const porId = new Map(GEOMETRIA.map((c) => [c.id, c]));
  return ORDEN_ENSAMBLADO.map((id, i) => ({
    ...porId.get(id)!,
    retardoMs: reducido ? 0 : i * ESCALON_MS,
  }));
}

/** Dos capas de contenido no comparten lugar (ignora bandas de fondo completas). */
export function sinSolape(a: CapaEscena, b: CapaEscena): boolean {
  return a.x + a.ancho <= b.x || b.x + b.ancho <= a.x || a.y + a.alto <= b.y || b.y + b.alto <= a.y;
}
