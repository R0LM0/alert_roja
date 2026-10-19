// Apodos únicos: cada apodo queda reservado para el dispositivo (dueno) que lo reclamó primero.
import { localSeguro, type AlmacenTexto } from "./cola-offline";
import { tieneGroseria } from "./profanity";
import { nuevoIdPartida } from "./ronda";

const CLAVE_DUENO = "alerta-roja:dueno";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_APODO = 20;

/** Mismo criterio que lower(btrim(jugador)) en SQL: sin espacios en los bordes ni mayúsculas. */
export function normalizarApodo(apodo: string): string {
  return apodo.trim().toLowerCase();
}

/** Variantes candidatas "Ana2", "Ana3"... sin pasar de 20 caracteres. */
export function variantesApodo(apodo: string, total = 12): string[] {
  const base = apodo.trim();
  return Array.from({ length: total }, (_, i) => {
    const sufijo = String(i + 2);
    return base.slice(0, MAX_APODO - sufijo.length).trimEnd() + sufijo;
  }).filter((c) => !tieneGroseria(c));
}

/** Hasta `cantidad` variantes libres. `ocupados` lleva apodos ya normalizados. */
export function sugerenciasPara(apodo: string, ocupados: ReadonlySet<string>, cantidad = 3): string[] {
  const libres: string[] = [];
  for (const candidato of variantesApodo(apodo)) {
    if (libres.length === cantidad) break;
    if (!ocupados.has(normalizarApodo(candidato))) libres.push(candidato);
  }
  return libres;
}

/** Token del dispositivo: se genera una vez y queda en localStorage. Sin almacenamiento, dura la pestaña. */
let duenoEfimero: string | undefined;

export function duenoLocal(almacen: AlmacenTexto | null = localSeguro()): string {
  try {
    const guardado = almacen?.getItem(CLAVE_DUENO);
    if (guardado && UUID.test(guardado)) return guardado;
    if (almacen) {
      const nuevo = nuevoIdPartida();
      almacen.setItem(CLAVE_DUENO, nuevo);
      return nuevo;
    }
  } catch {
    // modo privado o acceso denegado: se usa el token de la pestaña
  }
  return (duenoEfimero ??= nuevoIdPartida());
}

export type ResultadoReserva =
  | { estado: "libre" }
  | { estado: "ocupado"; mensaje: string; sugerencias: string[] }
  | { estado: "rechazado"; mensaje: string }
  | { estado: "sin-conexion" };

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Reserva el apodo para este dispositivo. Si no hay red o el servidor falla, el juego sigue:
 * el chequeo de POST /api/partidas es la guarda final.
 */
export async function reservarApodo(
  apodo: string,
  dueno: string,
  fetchFn: FetchFn = (u, i) => fetch(u, i),
): Promise<ResultadoReserva> {
  let res: Response;
  try {
    res = await fetchFn("/api/apodos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apodo, dueno }),
    });
  } catch {
    return { estado: "sin-conexion" };
  }
  if (res.ok) return { estado: "libre" };
  if (res.status === 409) {
    const cuerpo = (await res.json().catch(() => null)) as { sugerencias?: unknown } | null;
    const sugerencias = Array.isArray(cuerpo?.sugerencias)
      ? cuerpo.sugerencias.filter((s): s is string => typeof s === "string")
      : [];
    return { estado: "ocupado", mensaje: "Ese apodo ya está en uso", sugerencias };
  }
  if (res.status === 400) return { estado: "rechazado", mensaje: "Elige otro apodo" };
  return { estado: "sin-conexion" };
}
