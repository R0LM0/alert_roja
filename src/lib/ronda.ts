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

/** Lo que registra la interfaz por paciente. */
export type RespuestaUI = {
  paciente: PacienteRonda;
  estimacion_pct: number;
  decision: Decision;
  tiempo_ms: number;
};

const TIEMPO_MAX_MS = 600_000;

const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/** Arma el cuerpo del POST /api/partidas (el puntaje lo calcula el servidor). */
export function armarPartida(jugador: string, prevalencia: Prevalencia, respuestas: RespuestaUI[]): PartidaInput {
  return {
    jugador: jugador.trim(),
    prevalencia,
    respuestas: respuestas.map((r) => ({
      orden: r.paciente.orden,
      estimacion_pct: acotar(r.estimacion_pct, 0, 100),
      decision: r.decision,
      estaba_infectado: r.paciente.estaba_infectado,
      tiempo_ms: acotar(r.tiempo_ms, 0, TIEMPO_MAX_MS),
    })),
  };
}
