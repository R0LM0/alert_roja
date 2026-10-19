import { z } from "zod";
import { localSeguro, type AlmacenTexto } from "./cola-offline";
import { IDS_INSIGNIAS, type InsigniaInfo } from "./insignias";
import { tieneGroseria } from "./profanity";
import { normalizarApodo } from "./ranking";
import { respuestaSchema } from "./schema";

// Traspaso de datos entre /jugar y /resultado (sessionStorage) y apodo recordado (localStorage).
// Todo el acceso va en try/catch: el modo privado puede denegarlo.

const CLAVE_RESULTADO = "alerta-roja:resultado";
const CLAVE_APODO_SESION = "alerta-roja:apodo-sesion";
const CLAVE_APODO_RECUERDO = "alerta-roja:apodo";
const CLAVE_INSIGNIAS = "alerta-roja:insignias";
const MAX_APODOS_INSIGNIAS = 20;
/** Cada medalla del catálogo puede guardarse una vez por apodo. */
const MAX_INSIGNIAS = IDS_INSIGNIAS.length;

// Persistimos solo el id y la primera fecha; los textos e iconos se resuelven al pintar.
const insigniaGuardadaSchema = z.object({
  id: z.enum(IDS_INSIGNIAS),
  fecha: z.string().datetime(),
});
const historialSchema = z.array(z.object({
  jugador: z.string().min(1).max(20),
  // Un id retirado no invalida las demás insignias del apodo.
  insignias: z.array(z.unknown()).max(MAX_INSIGNIAS).transform((items) => items.flatMap((item) => {
    const validada = insigniaGuardadaSchema.safeParse(item);
    return validada.success ? [validada.data] : [];
  })),
})).max(MAX_APODOS_INSIGNIAS);

export type InsigniaGuardada = z.infer<typeof insigniaGuardadaSchema>;
type Historial = z.infer<typeof historialSchema>;

function leerHistorial(almacen: AlmacenTexto | null): Historial {
  try {
    const crudo = almacen?.getItem(CLAVE_INSIGNIAS);
    if (!crudo) return [];
    const parsed = historialSchema.safeParse(JSON.parse(crudo));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Acumula insignias de un turno terminado en este dispositivo, sin cambiar la primera fecha. */
export function guardarInsignias(
  jugador: string, insignias: readonly InsigniaInfo[], almacen: AlmacenTexto | null = localSeguro(),
): void {
  try {
    const apodo = normalizarApodo(jugador);
    if (!apodo || apodo.length > 20 || !insignias.length || !almacen) return;
    const historial = leerHistorial(almacen);
    let entrada = historial.find((h) => h.jugador === apodo);
    const fecha = new Date().toISOString();
    let cambiado = false;
    for (const insignia of insignias) {
      if (entrada?.insignias.some((i) => i.id === insignia.id)) continue;
      const guardada = insigniaGuardadaSchema.safeParse({ id: insignia.id, fecha });
      if (!guardada.success) continue; // ids desconocidos o datos inválidos no entran al historial
      if (!entrada) {
        entrada = { jugador: apodo, insignias: [] };
        historial.push(entrada);
      }
      if (entrada.insignias.length >= MAX_INSIGNIAS) break;
      entrada.insignias.push(guardada.data);
      cambiado = true;
    }
    if (!cambiado) return;
    // El orden del arreglo es el primer uso del apodo: repetir una ronda no rejuvenece la entrada.
    almacen.setItem(CLAVE_INSIGNIAS, JSON.stringify(historial.slice(-MAX_APODOS_INSIGNIAS)));
  } catch {
    // Modo privado o cuota llena: no interrumpir el resultado de la partida.
  }
}

/** Historial local del apodo; un valor corrupto o almacenamiento bloqueado equivale a ninguno. */
export function leerInsignias(jugador: string, almacen: AlmacenTexto | null = localSeguro()): InsigniaGuardada[] {
  try {
    const apodo = normalizarApodo(jugador);
    if (!apodo) return [];
    return leerHistorial(almacen).find((h) => h.jugador === apodo)?.insignias ?? [];
  } catch {
    return [];
  }
}

/** Borra únicamente el historial local de insignias. */
export function limpiarInsignias(almacen: AlmacenTexto | null = localSeguro()): void {
  try {
    almacen?.removeItem(CLAVE_INSIGNIAS);
  } catch {
    // nada que hacer
  }
}

const resultadoSchema = z.object({
  jugador: z.string().min(1).max(20),
  modo: z.enum(["normal", "experto"]),
  ronda: z
    .array(z.object({
      orden: z.number().int(), nombre: z.string(), seed: z.string(), estaba_infectado: z.boolean(),
      evidencia: z.enum(["conviviente", "contacto", "sintomas", "sin-antecedentes", "protegido"]),
    }))
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
