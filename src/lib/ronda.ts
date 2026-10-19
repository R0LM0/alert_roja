import { pacientesDeRonda } from "./pacientes";
import type { PartidaInput } from "./schema";
import { PACIENTES_POR_RONDA, PREVALENCIA, PREVALENCIA_EXPERTO, sortearPositivo } from "./stats";

export type Modo = "normal" | "experto";
export type Prevalencia = PartidaInput["prevalencia"];
export type Decision = PartidaInput["respuestas"][number]["decision"];

export function prevalenciaDeModo(modo: Modo): Prevalencia {
  return modo === "experto" ? PREVALENCIA_EXPERTO : PREVALENCIA;
}

export type PacienteRonda = {
  orden: number;
  nombre: string;
  seed: string;
  estaba_infectado: boolean;
};

/** Una ronda de 10 pacientes positivos; cada uno está infectado con probabilidad = VPP. */
export function crearRonda(seed: string, prevalencia: Prevalencia, rand: () => number = Math.random): PacienteRonda[] {
  return pacientesDeRonda(seed, PACIENTES_POR_RONDA).map((p, i) => ({
    orden: i + 1,
    nombre: p.nombre,
    seed: p.seed,
    estaba_infectado: sortearPositivo(rand, prevalencia).infectado,
  }));
}

/** uuid v4 para la clave de idempotencia; funciona también en http (sin `randomUUID`). */
export function nuevoIdPartida(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Lo que registra la interfaz por paciente. */
export type RespuestaUI = {
  paciente: PacienteRonda;
  estimacion_pct: number | null;
  decision: Decision;
  tiempo_ms: number;
};

const TIEMPO_MAX_MS = 600_000;

const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/**
 * Arma el cuerpo del POST /api/partidas (el puntaje lo calcula el servidor).
 * `id` (uuid por ronda) hace idempotente el guardado: los reintentos reusan el mismo.
 */
export function armarPartida(
  jugador: string,
  prevalencia: Prevalencia,
  respuestas: RespuestaUI[],
  id?: string,
): PartidaInput {
  return {
    ...(id ? { id } : {}),
    jugador: jugador.trim(),
    prevalencia,
    respuestas: respuestas.map((r) => ({
      orden: r.paciente.orden,
      estimacion_pct: r.estimacion_pct === null ? null : acotar(r.estimacion_pct, 0, 100),
      decision: r.decision,
      estaba_infectado: r.paciente.estaba_infectado,
      tiempo_ms: acotar(r.tiempo_ms, 0, TIEMPO_MAX_MS),
    })),
  };
}
