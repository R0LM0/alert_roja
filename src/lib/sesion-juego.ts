import { z } from "zod";
import { localSeguro, type AlmacenTexto } from "./cola-offline";
import { tieneGroseria } from "./profanity";
import { respuestaSchema } from "./schema";

// Traspaso de datos entre /jugar y /resultado (sessionStorage) y apodo recordado (localStorage).
// Todo el acceso va en try/catch: el modo privado puede denegarlo.

const CLAVE_RESULTADO = "alerta-roja:resultado";
const CLAVE_APODO_SESION = "alerta-roja:apodo-sesion";
const CLAVE_APODO_RECUERDO = "alerta-roja:apodo";

const resultadoSchema = z.object({
  jugador: z.string().min(1).max(20),
  modo: z.enum(["normal", "experto"]),
  ronda: z
    .array(z.object({ orden: z.number().int(), nombre: z.string(), seed: z.string(), estaba_infectado: z.boolean() }))
    .length(10),
  respuestas: z.array(respuestaSchema).length(10),
  puntaje: z.number().int().optional(),
  estado: z.enum(["guardado", "pendiente"]),
  id: z.string().optional(),
});

export type ResultadoJuego = z.infer<typeof resultadoSchema>;

function sesionSegura(): AlmacenTexto | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarResultado(r: ResultadoJuego, almacen: AlmacenTexto | null = sesionSegura()): void {
  try {
    almacen?.setItem(CLAVE_RESULTADO, JSON.stringify(r));
  } catch {
    // sin almacenamiento: /resultado mostrará el estado vacío
  }
}

export function leerResultado(almacen: AlmacenTexto | null = sesionSegura()): ResultadoJuego | null {
  try {
    const crudo = almacen?.getItem(CLAVE_RESULTADO);
    if (!crudo) return null;
    const r = resultadoSchema.safeParse(JSON.parse(crudo));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function limpiar(almacen: AlmacenTexto | null = sesionSegura()): void {
  try {
    almacen?.removeItem(CLAVE_RESULTADO);
  } catch {
    // nada que hacer
  }
}

/** Apodo de la sesión actual (lo lee /jugar). */
export function guardarApodo(apodo: string, almacen: AlmacenTexto | null = sesionSegura()): void {
  try {
    almacen?.setItem(CLAVE_APODO_SESION, apodo);
  } catch {
    // ignorar
  }
}

export function leerApodo(almacen: AlmacenTexto | null = sesionSegura()): string | null {
  try {
    return almacen?.getItem(CLAVE_APODO_SESION) || null;
  } catch {
    return null;
  }
}

/** Último apodo usado, para rellenar el campo la próxima vez (localStorage). */
export function recordarApodo(apodo: string, almacen: AlmacenTexto | null = localSeguro()): void {
  try {
    almacen?.setItem(CLAVE_APODO_RECUERDO, apodo);
  } catch {
    // ignorar
  }
}

export function apodoRecordado(almacen: AlmacenTexto | null = localSeguro()): string {
  try {
    return almacen?.getItem(CLAVE_APODO_RECUERDO) ?? "";
  } catch {
    return "";
  }
}

export const APODO_MAX = 20;

/** Mensaje de error (en español) o null si el apodo es válido; mismo filtro que el servidor. */
export function validarApodo(valor: string): string | null {
  const apodo = valor.trim();
  if (apodo.length === 0) return 'Escribe un apodo';
  if (apodo.length > APODO_MAX) return `Máximo ${APODO_MAX} caracteres`;
  if (tieneGroseria(apodo)) return 'Elige otro apodo';
  return null;
}
