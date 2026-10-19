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
