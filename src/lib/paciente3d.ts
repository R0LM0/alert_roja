// El turno decide cuándo sale cada paciente; estos tiempos se comparten con sus esperas.
export const DURACION_ENTRADA_MS = 2000;
export const DURACION_SALIDA_MS = 2000;
const DURACION_GIRO_MS = 350;
const DURACION_FUNDIDO_MS = 400;

const CAMISAS = ["#72959b", "#ad837f", "#8c91ac", "#9a9471", "#8b789b"] as const;
const PANTALONES = ["#514d6b", "#454e5d", "#5b514b", "#454f4b"] as const;
const PIELES = ["#d9b995", "#b98e73", "#e5c4aa", "#a87966"] as const;

/** La semilla del avatar determina la ropa y piel; nunca el estado de infección (S11). */
export function coloresPaciente(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  const indice = (sal: number, largo: number) => {
    let valor = Math.imul(hash ^ sal, 0x45d9f3b);
    valor = Math.imul(valor ^ (valor >>> 16), 0x45d9f3b);
    return ((valor ^ (valor >>> 16)) >>> 0) % largo;
  };
  return {
    camisa: CAMISAS[indice(1, CAMISAS.length)],
    pantalon: PANTALONES[indice(2, PANTALONES.length)],
    piel: PIELES[indice(3, PIELES.length)],
  };
}

/** Ángulo hacia la puerta, independientemente de los 2 s de caminata. */
export function anguloSalida(t: number): number {
  return Math.PI * suavizar(t / DURACION_GIRO_MS);
}

/** Fundido solo durante la entrada; movimiento reducido presenta el paciente completo. */
export function alphaEntrada(t: number, reducido = false): number {
  return reducido ? 1 : Math.min(Math.max(t / DURACION_FUNDIDO_MS, 0), 1);
}

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
