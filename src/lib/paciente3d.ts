// El turno decide cuándo sale cada paciente; estos tiempos se comparten con sus esperas.
export const DURACION_ENTRADA_MS = 2000;
export const DURACION_SALIDA_MS = 2000;

const Z_PUERTA = -3.6;
type Punto3D = [number, number, number];
type FasePaciente = "entrando" | "atendiendo" | "saliendo" | "fuera";

function suavizar(p: number): number {
  const x = Math.min(Math.max(p, 0), 1);
  return x * x * (3 - 2 * x);
}

/** t mide el tiempo desde el inicio de la fase actual, no desde un ciclo global. */
export function fasePaciente(t: number, saliendo: boolean, reducido = false): FasePaciente {
  if (saliendo) return reducido || t >= DURACION_SALIDA_MS ? "fuera" : "saliendo";
  return reducido || t >= DURACION_ENTRADA_MS ? "atendiendo" : "entrando";
}

/** De la puerta al escritorio, o desde el escritorio de vuelta a la puerta. */
export function posPaciente(t: number, saliendo: boolean, reducido = false): Punto3D {
  if (reducido) return [0, 0, saliendo ? Z_PUERTA : 0];
  if (saliendo) return [0, 0, t <= 0 ? 0 : Z_PUERTA * suavizar(t / DURACION_SALIDA_MS)];
  return [0, 0, t >= DURACION_ENTRADA_MS ? 0 : Z_PUERTA * (1 - suavizar(t / DURACION_ENTRADA_MS))];
}

/** El llamador guarda avisado en una ref antes de invocar el callback. */
export function debeAvisarLlegada(t: number, avisado: boolean, reducido: boolean, saliendo: boolean): boolean {
  return !avisado && !saliendo && (reducido || t >= DURACION_ENTRADA_MS);
}

/** Fase angular compartida por piernas y brazos; el rig aplica la amplitud. */
export function pasoWalk(t: number): number {
  return (t / 200) * Math.PI;
}
