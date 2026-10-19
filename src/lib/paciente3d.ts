// El turno decide cuándo sale cada paciente; estos tiempos se comparten con sus esperas.
export const DURACION_ENTRADA_MS = 2000;
export const DURACION_SALIDA_MS = 2000;
const DURACION_GIRO_MS = 350;
const DURACION_FUNDIDO_MS = 400;

const CAMISAS = ["#72959b", "#ad837f", "#8c91ac", "#9a9471", "#8b789b"] as const;
const PANTALONES = ["#514d6b", "#454e5d", "#5b514b", "#454f4b"] as const;
const PIELES = ["#d9b995", "#b98e73", "#e5c4aa", "#a87966"] as const;
const PEINADOS = ["corto", "largo", "rizado"] as const;
const COLORES_PELO = ["#393531", "#655044", "#817366"] as const;
const ATUENDOS = ["camisa", "bata", "chaleco"] as const;

function hashSemilla(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return hash;
}

function indiceSemilla(hash: number, sal: number, largo: number): number {
  let valor = Math.imul(hash ^ sal, 0x45d9f3b);
  valor = Math.imul(valor ^ (valor >>> 16), 0x45d9f3b);
  return ((valor ^ (valor >>> 16)) >>> 0) % largo;
}

/** La semilla del avatar determina la ropa y piel; nunca el estado de infección (S11). */
export function coloresPaciente(seed: string) {
  const hash = hashSemilla(seed);
  return {
    camisa: CAMISAS[indiceSemilla(hash, 1, CAMISAS.length)],
    pantalon: PANTALONES[indiceSemilla(hash, 2, PANTALONES.length)],
    piel: PIELES[indiceSemilla(hash, 3, PIELES.length)],
  };
}

/** S11: la semilla es independiente de estaba_infectado; la variedad no da pistas de infección. */
export function derivarAspecto(seed: string) {
  const hash = hashSemilla(seed);
  return {
    altura: (135 + indiceSemilla(hash, 4, 36)) / 100,
    contextura: (85 + indiceSemilla(hash, 5, 36)) / 100,
    pelo: PEINADOS[indiceSemilla(hash, 6, PEINADOS.length)],
    colorPelo: COLORES_PELO[indiceSemilla(hash, 7, COLORES_PELO.length)],
    atuendo: ATUENDOS[indiceSemilla(hash, 8, ATUENDOS.length)],
  };
}

/** El paciente mira en la dirección de su destino, con un giro suave al iniciar la marcha. */
export function anguloSalida(t: number, salida: SalidaPaciente = "puerta"): number {
  if (t <= 0) return 0;
  const [x, , z] = salida === "cuarentena" ? POS_CUARENTENA : POS_PUERTA;
  return Math.atan2(x, z) * suavizar(t / DURACION_GIRO_MS);
}

/** Fundido solo durante la entrada; movimiento reducido presenta el paciente completo. */
export function alphaEntrada(t: number, reducido = false): number {
  return reducido ? 1 : Math.min(Math.max(t / DURACION_FUNDIDO_MS, 0), 1);
}

type Punto3D = [number, number, number];
export type SalidaPaciente = "cuarentena" | "puerta";
const POS_PUERTA: Punto3D = [0, 0, -3.6];
// A la izquierda de la puerta, dentro del encuadre incluso en pantallas estrechas.
export const POS_CUARENTENA: Punto3D = [-1.15, 0, -2.85];
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

/** De la puerta al escritorio, y al decidir hacia la puerta o el área de cuarentena. */
export function posPaciente(t: number, saliendo: boolean, reducido = false, salida: SalidaPaciente = "puerta"): Punto3D {
  const destino = salida === "cuarentena" ? POS_CUARENTENA : POS_PUERTA;
  if (reducido) return saliendo ? [...destino] : [0, 0, 0];
  if (saliendo) {
    if (t <= 0) return [0, 0, 0];
    if (t >= DURACION_SALIDA_MS) return [...destino];
    const avance = suavizar(t / DURACION_SALIDA_MS);
    return [destino[0] * avance, 0, destino[2] * avance];
  }
  if (t >= DURACION_ENTRADA_MS) return [0, 0, 0];
  return [0, 0, POS_PUERTA[2] * (1 - suavizar(t / DURACION_ENTRADA_MS))];
}

/** El llamador guarda avisado en una ref antes de invocar el callback. */
export function debeAvisarLlegada(t: number, avisado: boolean, reducido: boolean, saliendo: boolean): boolean {
  return !avisado && !saliendo && (reducido || t >= DURACION_ENTRADA_MS);
}

/** Fase angular compartida por piernas y brazos; el rig aplica la amplitud. */
export function pasoWalk(t: number): number {
  return (t / 200) * Math.PI;
}
