import { describe, expect, it } from "vitest";
import { armarPartida, crearRonda } from "./ronda";
import { partidaSchema } from "./schema";

const base = () => {
  const ronda = crearRonda("schema", 0.1, () => 0.9);
  return armarPartida(
    "Ana",
    0.1,
    ronda.map((p) => ({ paciente: p, estimacion_pct: 30, decision: "liberar" as const, tiempo_ms: 400 })),
  );
};

describe("respuestaSchema.estimacion_pct", () => {
  it("acepta null u omisión y sigue rechazando porcentajes inválidos", () => {
    const original = base();
    const sin = original.respuestas.map(({ estimacion_pct: _estimacion, ...r }) => r);
    expect(partidaSchema.safeParse({ ...original, respuestas: sin }).success).toBe(true);
    expect(partidaSchema.safeParse({ ...original, respuestas: original.respuestas.map((r) => ({ ...r, estimacion_pct: null })) }).success).toBe(true);
    for (const invalida of [-1, 101, 1.5, "50"]) {
      expect(partidaSchema.safeParse({ ...original, respuestas: [{ ...original.respuestas[0], estimacion_pct: invalida }, ...original.respuestas.slice(1)] }).success).toBe(false);
    }
  });
});

describe("partidaSchema.id (clave de idempotencia)", () => {
  it("es opcional: sin id sigue siendo válido (retrocompatible)", () => {
    expect(partidaSchema.safeParse(base()).success).toBe(true);
  });

  it("acepta un uuid y lo conserva", () => {
    const id = "3f2b8c1e-9d4a-4b7e-8a61-0c5d2e7f9a10";
    const r = partidaSchema.safeParse({ ...base(), id });
    expect(r.success).toBe(true);
    expect(r.success && r.data.id).toBe(id);
  });

  it.each(["", "no-es-uuid", "123", "3f2b8c1e-9d4a-4b7e-8a61-0c5d2e7f9a1", "x".repeat(200)])(
    "rechaza un id inválido (%j)",
    (id) => {
      expect(partidaSchema.safeParse({ ...base(), id }).success).toBe(false);
    },
  );

  it("rechaza un id que no es texto", () => {
    expect(partidaSchema.safeParse({ ...base(), id: 42 }).success).toBe(false);
  });
});
