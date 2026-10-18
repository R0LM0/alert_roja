// Lógica pura del consultorio 3D en primera persona (/jugar).
// La UI (R3F) no decide tiempos: importa estas constantes y funciones.
// S3: la puerta gira sobre su bisagra con ease-out durante ~1.5 s.
// S10: si no hay WebGL se usa el flujo 2D actual.

/** Duración de la apertura de la puerta en ms (S3). */
export const DURACION_PUERTA_MS = 1500;

/**
 * Respiro con la puerta cerrada antes de abrir: la foto inicial es
 * determinista aunque el screenshot tarde unos ms en salir.
 */
export const RETRASO_PUERTA_MS = 250;

/** Ángulo final de la puerta abierta: ~-110° hacia adentro (radianes). */
export const ANGULO_PUERTA_ABIERTA = (-110 * Math.PI) / 180;

/**
 * Ángulo de la puerta (radianes) según el tiempo transcurrido desde que
 * empieza a abrirse. Ease-out cúbico: arranca decidida y asienta al final.
 * Fuera de rango se fija (0 cerrada, `ANGULO_PUERTA_ABIERTA` abierta).
 */
export function anguloPuerta(transcurridoMs: number): number {
  const p = Math.min(Math.max((transcurridoMs - RETRASO_PUERTA_MS) / DURACION_PUERTA_MS, 0), 1);
  if (p <= 0) return 0;
  return ANGULO_PUERTA_ABIERTA * (1 - Math.pow(1 - p, 3));
}

/** La puerta terminó de abrirse: la primera tarjeta ya puede aparecer. */
export function puertaAbierta(transcurridoMs: number): boolean {
  return transcurridoMs >= RETRASO_PUERTA_MS + DURACION_PUERTA_MS;
}

/**
 * Hay un contexto WebGL utilizable. En el servidor (sin `document`) informa
 * que no, y el llamador usa el flujo 2D (fallback S10).
 */
export function webglDisponible(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const lienzo = document.createElement("canvas");
    return !!(lienzo.getContext("webgl2") ?? lienzo.getContext("webgl"));
  } catch {
    return false;
  }
}
