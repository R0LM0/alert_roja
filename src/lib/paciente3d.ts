// Ciclo de muestra del paciente: T3 conectará los turnos reales.
export const DURACION_ENTRADA_MS = 2000;
export const ESPERA_MS = 2500;
export const DURACION_SALIDA_MS = 2000;
export const PAUSA_MS = 1000;

const FIN_ESPERA_MS = DURACION_ENTRADA_MS + ESPERA_MS;
const FIN_SALIDA_MS = FIN_ESPERA_MS + DURACION_SALIDA_MS;
const CICLO_MS = FIN_SALIDA_MS + PAUSA_MS;

type Punto3D = [number, number, number];
type FasePaciente = "entrando" | "atendiendo" | "saliendo" | "fuera";

function tiempoCiclo(t: number): number {
  return ((t % CICLO_MS) + CICLO_MS) % CICLO_MS;
}

function suavizar(p: number): number {
  const x = Math.min(Math.max(p, 0), 1);
  return x * x * (3 - 2 * x);
}

/** La pausa deja la escena vacía antes del siguiente recorrido. */
export function fasePaciente(t: number): FasePaciente {
  const tiempo = tiempoCiclo(t);
  if (tiempo < DURACION_ENTRADA_MS) return "entrando";
  if (tiempo < FIN_ESPERA_MS) return "atendiendo";
  if (tiempo < FIN_SALIDA_MS) return "saliendo";
  return "fuera";
}

/** Del umbral de la puerta al escritorio y vuelta, con velocidad cero en ambos extremos. */
export function posPaciente(t: number): Punto3D {
  const tiempo = tiempoCiclo(t);
  if (tiempo < DURACION_ENTRADA_MS) {
    return [0, 0, -3.6 + 3.6 * suavizar(tiempo / DURACION_ENTRADA_MS)];
  }
  if (tiempo <= FIN_ESPERA_MS) return [0, 0, 0];
  if (tiempo < FIN_SALIDA_MS) {
    return [0, 0, -3.6 * suavizar((tiempo - FIN_ESPERA_MS) / DURACION_SALIDA_MS)];
  }
  return [0, 0, -3.6];
}

/** Fase angular compartida por piernas y brazos; el rig aplica la amplitud. */
export function pasoWalk(t: number): number {
  return (t / 200) * Math.PI;
}
