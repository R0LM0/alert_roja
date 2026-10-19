/**
 * Lógica pura del sonido: niveles, tiempos y notas de los efectos y del ambiente de
 * consultorio. No toca Web Audio (eso vive en `ambiente-audio.ts`), así que se testea sin navegador.
 */

export type NombreSonido = "click" | "llegada" | "aislar" | "liberar" | "resultado" | "insignia";

/** Duración de cada efecto (s). Todos son cortos (< 1,2 s). */
export const DURACION_EFECTO_S: Record<NombreSonido, number> = {
  click: 0.05,
  llegada: 1,
  aislar: 0.5,
  liberar: 1.05,
  resultado: 1.05,
  insignia: 0.55,
};

/** Notas en semitonos desde A4 (440 Hz): 0 = A4, 3 = C5, 7 = E5, 10 = G5, 15 = C6. */
export const NOTAS = {
  aislar: [7, 3], // E5 y C5: dos tonos suaves, el segundo más grave
  liberar: [10, 17], // G5 y D6: campanilla agradable
  resultado: [3, 7, 10, 15], // C5 E5 G5 C6: arpegio ascendente
  insignia: [12, 19, 24, 31], // destello agudo
} as const;

/**
 * Niveles del ambiente en dB respecto a un efecto de referencia (pico REF_EFECTO).
 * Son valores de criterio: se ajustan al oído en un celular real.
 */
export const REF_EFECTO = 0.25;
export const NIVELES_AMBIENTE = {
  sala: -30, // tono de sala (ruido marrón filtrado)
  latido: -22, // pitido suave del monitor
  azar: -26, // roce de papeles y pasos lejanos
  duckingDb: -6, // cuánto baja el ambiente mientras suena un efecto
} as const;

export const FUNDIDO_ENTRADA_S = 2.5;
export const FUNDIDO_SALIDA_S = 0.6;

const MINIMO = 0.0001;

/** Ganancia lineal de un nivel en dB (0 dB = 1, -6 dB ~ 0,5, -20 dB = 0,1). */
export function dbAGanancia(db: number): number {
  return Math.pow(10, db / 20);
}

/** Espera entre dos latidos del monitor (ms): entre 1,1 y 1,4 s. */
export function esperaLatido(aleatorio: () => number = Math.random): number {
  return 1100 + aleatorio() * 300;
}

/** Espera hasta el siguiente sonido de azar (ms): entre 6 y 12 s. */
export function esperaAzar(aleatorio: () => number = Math.random): number {
  return 6000 + aleatorio() * 6000;
}

export type SonidoAzar = "roce" | "pasos";

/** Qué sonido de azar toca: roce de papeles (60 %) o pasos lejanos (40 %). */
export function sonidoAzar(aleatorio: () => number = Math.random): SonidoAzar {
  return aleatorio() < 0.6 ? "roce" : "pasos";
}

/** Frecuencia (Hz) de una nota, en semitonos desde A4 = 440 Hz. */
export function frecuenciaNota(semitonos: number): number {
  return 440 * Math.pow(2, semitonos / 12);
}

/** Instantes (s) de `n` pasos separados `separacion` s, desde `inicio`. */
export function tiemposPasos(n: number, inicio: number, separacion: number): number[] {
  return Array.from({ length: n }, (_, i) => inicio + i * separacion);
}

export interface PuntoEnvolvente {
  t: number;
  v: number;
}

/**
 * Envolvente de amplitud con subida corta y caída hasta casi cero (v > 0 siempre,
 * apta para rampas exponenciales). `t` va en segundos desde el inicio del sonido.
 */
export function envolvente(duracion: number, pico: number, ataque = 0.01): PuntoEnvolvente[] {
  const subida = Math.min(Math.max(ataque, 0.003), duracion / 2);
  return [
    { t: 0, v: MINIMO },
    { t: subida, v: pico },
    { t: duracion, v: MINIMO },
  ];
}

/**
 * Ducking: el ambiente baja a `profundidadDb` en `ataque` s, aguanta `duracion` s
 * y vuelve en `liberacion` s. El primer punto es el valor actual (lo pone el motor).
 */
export function puntosDucking(
  duracion: number,
  profundidadDb: number = NIVELES_AMBIENTE.duckingDb,
  ataque = 0.06,
  liberacion = 0.8,
): PuntoEnvolvente[] {
  const bajo = dbAGanancia(profundidadDb);
  return [
    { t: 0, v: 1 },
    { t: ataque, v: bajo },
    { t: duracion, v: bajo },
    { t: duracion + liberacion, v: 1 },
  ];
}
