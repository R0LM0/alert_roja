// Podio de la feria: top 3 por modo para premiar. Lógica pura (sin base ni React).
import { compararRanking } from "./ranking";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "./stats";

const PUESTOS = 3;

/** Fila del ranking de temporada (primer intento por apodo, ya filtrada por el cierre). */
export type FilaPodio = {
  jugador: string;
  prevalencia: number;
  puntaje: number;
  tiempoTotalMs: number | null;
  creada_en: string;
  /** Token del dispositivo que reservó el apodo; null si no hay reserva. Solo para el aviso: nunca sale al público. */
  dueno: string | null;
};

/** Un puesto del podio. No lleva `dueno`. */
export type Puesto = {
  posicion: 1 | 2 | 3;
  jugador: string;
  puntaje: number;
  tiempoTotalMs: number | null;
  creada_en: string;
  /** Igual puntaje y tiempo que la fila de al lado (también cuenta el 3.º contra el 4.º). Se ordena por llegada. */
  empate: boolean;
  /** El mismo dispositivo ocupa más de un puesto en los dos podios. Solo aviso: el organizador decide. */
  mismoDispositivo: boolean;
};

export type Podio = {
  normal: Puesto[];
  experto: Puesto[];
  hayEmpate: boolean;
  hayMismoDispositivo: boolean;
};

function iguales(a: FilaPodio, b: FilaPodio): boolean {
  return a.puntaje === b.puntaje && a.tiempoTotalMs === b.tiempoTotalMs;
}

/** Mayor puntaje, menor tiempo total, y después quien jugó primero (compararRanking). */
function ordenarDeModo(filas: FilaPodio[], prevalencia: number): FilaPodio[] {
  return filas
    .filter((f) => f.prevalencia === prevalencia)
    .sort((a, b) =>
      compararRanking(
        { puntaje: a.puntaje, tiempoTotalMs: a.tiempoTotalMs, creadaEn: a.creada_en },
        { puntaje: b.puntaje, tiempoTotalMs: b.tiempoTotalMs, creadaEn: b.creada_en },
      ),
    );
}

/** Arma el podio de los dos modos. Con menos de 3 jugadores, el podio trae menos puestos. */
export function armarPodio(filas: FilaPodio[]): Podio {
  const normal = ordenarDeModo(filas, PREVALENCIA);
  const experto = ordenarDeModo(filas, PREVALENCIA_EXPERTO);

  // Cuántos puestos ocupa cada dispositivo entre los dos podios.
  const usos = new Map<string, number>();
  for (const f of [...normal.slice(0, PUESTOS), ...experto.slice(0, PUESTOS)]) {
    if (f.dueno) usos.set(f.dueno, (usos.get(f.dueno) ?? 0) + 1);
  }

  const puestos = (ordenadas: FilaPodio[]): Puesto[] =>
    ordenadas.slice(0, PUESTOS).map((f, i) => ({
      posicion: (i + 1) as Puesto["posicion"],
      jugador: f.jugador,
      puntaje: f.puntaje,
      tiempoTotalMs: f.tiempoTotalMs,
      creada_en: f.creada_en,
      empate: (i > 0 && iguales(f, ordenadas[i - 1])) || (i + 1 < ordenadas.length && iguales(f, ordenadas[i + 1])),
      mismoDispositivo: f.dueno !== null && (usos.get(f.dueno) ?? 0) > 1,
    }));

  const podioNormal = puestos(normal);
  const podioExperto = puestos(experto);
  const todos = [...podioNormal, ...podioExperto];
  return {
    normal: podioNormal,
    experto: podioExperto,
    hayEmpate: todos.some((p) => p.empate),
    hayMismoDispositivo: todos.some((p) => p.mismoDispositivo),
  };
}

const FORMATO_FERIA = new Intl.DateTimeFormat("es-NI", {
  timeZone: "America/Managua",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "20/10 18:05" en hora de Managua, para mostrar a qué hora se jugó o cierra la feria. */
export function formatearHoraFeria(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = Object.fromEntries(FORMATO_FERIA.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}
