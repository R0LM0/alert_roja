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

/** Recorrido desde la puerta hasta sentarse y girar hacia ella. */
export const DURACION_ENTRADA_MS = 2000;

const FIN_PUERTA_MS = RETRASO_PUERTA_MS + DURACION_PUERTA_MS;
const FIN_INTRO_MS = FIN_PUERTA_MS + DURACION_ENTRADA_MS;

type Punto3D = [number, number, number];

function interpolar(a: Punto3D, b: Punto3D, p: number): Punto3D {
  if (p <= 0) return a;
  if (p >= 1) return b;
  return [
    a[0] + (b[0] - a[0]) * p,
    a[1] + (b[1] - a[1]) * p,
    a[2] + (b[2] - a[2]) * p,
  ];
}

/** Smoothstep ligeramente asimétrico: velocidad cero en ambos extremos. */
function suavizar(p: number): number {
  const x = Math.min(Math.max(p, 0), 1);
  return Math.pow(x * x * (3 - 2 * x), 1.15);
}

/** Fases medidas desde el montaje de la escena. */
export function faseIntro(transcurridoMs: number): "puerta" | "entrando" | "listo" {
  if (transcurridoMs < FIN_PUERTA_MS) return "puerta";
  if (transcurridoMs < FIN_INTRO_MS) return "entrando";
  return "listo";
}

/** Cámara del pasillo a la silla; nunca atraviesa la puerta antes de abrir. */
export function posCamara(transcurridoMs: number): Punto3D {
  return interpolar(
    [0, 1.6, -7.2],
    [0, 1.25, 2.4],
    suavizar((transcurridoMs - FIN_PUERTA_MS) / DURACION_ENTRADA_MS),
  );
}

/** El doctor mira hacia adelante al entrar, luego vuelve la cabeza hacia la puerta. */
export function objetivoCamara(transcurridoMs: number): Punto3D {
  const p = (transcurridoMs - FIN_PUERTA_MS) / DURACION_ENTRADA_MS;
  if (p <= 0.5) return interpolar([0, 1.3, -3.9], [0, 1.2, 2], suavizar(p * 2));
  return interpolar([0, 1.2, 2], [0, 1.1, -4], suavizar((p - 0.5) * 2));
}

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
