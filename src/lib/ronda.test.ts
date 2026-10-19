import { describe, expect, it } from "vitest";
import { casoDePaciente, EVIDENCIAS } from "./caso-bayesiano";
import { partidaSchema } from "./schema";
import { armarPartida, crearRonda, nuevoIdPartida, prevalenciaDeModo, type RespuestaUI } from "./ronda";

/** PRNG determinista (mulberry32) para las pruebas. */
function prng(semilla: number): () => number {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("prevalenciaDeModo", () => {
  it("normal = 10 %, experto = 1 %", () => {
    expect(prevalenciaDeModo("normal")).toBe(0.1);
    expect(prevalenciaDeModo("experto")).toBe(0.01);
  });
});

describe("crearRonda", () => {
  it("crea 10 pacientes ordenados 1..10 con nombre y semilla", () => {
    const ronda = crearRonda("s1", 0.1, prng(1));
    expect(ronda).toHaveLength(10);
    expect(ronda.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(ronda.map((p) => p.nombre)).size).toBe(10);
    expect(ronda.every((p) => p.seed.startsWith("s1") && typeof p.estaba_infectado === "boolean")).toBe(true);
  });

  it("repite evidencias e infecciones con la misma semilla, sin depender del azar externo", () => {
    for (const prev of [0.1, 0.01] as const) {
      const primera = crearRonda("s1", prev, () => 0);
      const segunda = crearRonda("s1", prev, () => 0.999);
      expect(primera.map(({ evidencia, estaba_infectado }) => ({ evidencia, estaba_infectado }))).toEqual(
        segunda.map(({ evidencia, estaba_infectado }) => ({ evidencia, estaba_infectado })),
      );
      expect(primera).toEqual(crearRonda("s1", prev));
    }
  });

  it("distribuye evidencias distintas entre los 10 pacientes de ambas modalidades", () => {
    for (const prev of [0.1, 0.01] as const) {
      const ronda = crearRonda("s1", prev);
      expect(new Set(ronda.map((p) => p.evidencia)).size).toBeGreaterThan(1);
      expect(ronda.map((p) => p.evidencia)).toEqual(
        ronda.map((p) => casoDePaciente(p.seed, prev === 0.1 ? "normal" : "experto").evidencia),
      );
    }
  });

  it("usa el previo de la modalidad y sortea la infección del caso con esa evidencia", () => {
    for (const [prev, modalidad] of [[0.1, "normal"], [0.01, "experto"]] as const) {
      const ronda = crearRonda("s1", prev);
      for (const paciente of ronda) {
        const caso = casoDePaciente(paciente.seed, modalidad);
        expect(EVIDENCIAS[caso.evidencia].previo[modalidad]).toBe(caso.previo);
        expect(paciente).toMatchObject({ evidencia: caso.evidencia, estaba_infectado: caso.infectado });
      }
    }
  });

  it("cambiar la evidencia/modalidad cambia el sorteo de infección en casos del mismo origen", () => {
    const normal = crearRonda("s1", 0.1);
    const experto = crearRonda("s1", 0.01);
    expect(normal.map((p) => p.evidencia)).toEqual(experto.map((p) => p.evidencia));
    expect(normal.some((p, i) => p.estaba_infectado !== experto[i].estaba_infectado)).toBe(true);
  });
});

describe("nuevoIdPartida", () => {
  it("genera uuid v4 válidos y distintos", () => {
    const a = nuevoIdPartida();
    expect(partidaSchema.shape.id.safeParse(a).success).toBe(true);
    expect(nuevoIdPartida()).not.toBe(a);
  });

  it("sigue siendo uuid sin crypto.randomUUID (http en la red local no es contexto seguro)", () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(partidaSchema.shape.id.safeParse(nuevoIdPartida()).success).toBe(true);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

const DUENO = "5b1c9e2a-7d3f-4e8a-9c60-2f4b8d1e7a35";

describe("armarPartida", () => {
  const ronda = crearRonda("s2", 0.1, prng(3));
  const respuestas: RespuestaUI[] = ronda.map((p, i) => ({
    paciente: p,
    estimacion_pct: i * 10,
    decision: i % 2 ? "aislar" : "liberar",
    tiempo_ms: 1000 + i,
  }));

  it("produce un payload que cumple el schema del POST", () => {
    const payload = armarPartida("  Ana ", 0.1, respuestas, DUENO);
    expect(partidaSchema.safeParse(payload).success).toBe(true);
    expect(payload.dueno).toBe(DUENO);
    expect(payload.prevalencia).toBe(0.1);
    expect(payload.respuestas[2]).toEqual({
      orden: 3,
      estimacion_pct: 20,
      decision: "liberar",
      evidencia: ronda[2].evidencia,
      estaba_infectado: ronda[2].estaba_infectado,
      tiempo_ms: 1002,
    });
  });

  it("transporta la evidencia de cada paciente en su respuesta", () => {
    const payload = armarPartida("Ana", 0.1, respuestas, DUENO);
    expect(payload.respuestas.map((r) => r.evidencia)).toEqual(ronda.map((p) => p.evidencia));
  });

  it("conserva estimación nula en el payload de decisión pura", () => {
    const payload = armarPartida("Ana", 0.1, respuestas.map((r) => ({ ...r, estimacion_pct: null })), DUENO);
    expect(payload.respuestas.every((r) => r.estimacion_pct === null)).toBe(true);
    expect(partidaSchema.safeParse(payload).success).toBe(true);
  });

  it("incluye el id de idempotencia cuando se entrega y lo omite si no", () => {
    const id = "3f2b8c1e-9d4a-4b7e-8a61-0c5d2e7f9a10";
    const con = armarPartida("Ana", 0.1, respuestas, DUENO, id);
    expect(con.id).toBe(id);
    expect(partidaSchema.safeParse(con).success).toBe(true);
    expect("id" in armarPartida("Ana", 0.1, respuestas, DUENO)).toBe(false);
  });

  it("redondea y acota estimación y tiempo", () => {
    const raras = respuestas.map((r) => ({ ...r, estimacion_pct: 100.6, tiempo_ms: 999_999.4 }));
    const payload = armarPartida("Ana", 0.01, raras, DUENO);
    expect(payload.respuestas[0].estimacion_pct).toBe(100);
    expect(payload.respuestas[0].tiempo_ms).toBe(600_000);
    expect(partidaSchema.safeParse(payload).success).toBe(true);
  });
});
