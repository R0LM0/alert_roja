import { describe, expect, it } from "vitest";
import { partidaSchema } from "./schema";
import { armarPartida, crearRonda, prevalenciaDeModo, type RespuestaUI } from "./ronda";
import { vppBayes } from "./stats";

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

  it("es determinista con la misma semilla y el mismo PRNG", () => {
    expect(crearRonda("s1", 0.1, prng(7))).toEqual(crearRonda("s1", 0.1, prng(7)));
  });

  it("la proporción de infectados converge al VPP (10 % -> 1/3; 1 % -> 4,3 %)", () => {
    for (const prev of [0.1, 0.01] as const) {
      const azar = prng(42);
      let infectados = 0;
      const rondas = 3000;
      for (let i = 0; i < rondas; i++) {
        infectados += crearRonda(`r${i}`, prev, azar).filter((p) => p.estaba_infectado).length;
      }
      expect(infectados / (rondas * 10)).toBeCloseTo(vppBayes(prev), 1);
    }
  });
});

describe("armarPartida", () => {
  const ronda = crearRonda("s2", 0.1, prng(3));
  const respuestas: RespuestaUI[] = ronda.map((p, i) => ({
    paciente: p,
    estimacion_pct: i * 10,
    decision: i % 2 ? "aislar" : "liberar",
    tiempo_ms: 1000 + i,
  }));

  it("produce un payload que cumple el schema del POST", () => {
    const payload = armarPartida("  Ana ", 0.1, respuestas);
    expect(partidaSchema.safeParse(payload).success).toBe(true);
    expect(payload.prevalencia).toBe(0.1);
    expect(payload.respuestas[2]).toEqual({
      orden: 3,
      estimacion_pct: 20,
      decision: "liberar",
      estaba_infectado: ronda[2].estaba_infectado,
      tiempo_ms: 1002,
    });
  });

  it("redondea y acota estimación y tiempo", () => {
    const raras = respuestas.map((r) => ({ ...r, estimacion_pct: 100.6, tiempo_ms: 999_999.4 }));
    const payload = armarPartida("Ana", 0.01, raras);
    expect(payload.respuestas[0].estimacion_pct).toBe(100);
    expect(payload.respuestas[0].tiempo_ms).toBe(600_000);
    expect(partidaSchema.safeParse(payload).success).toBe(true);
  });
});
