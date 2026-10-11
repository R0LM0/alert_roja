import { describe, expect, it } from "vitest";
import { pacienteDeSemilla, pacientesDeRonda } from "./pacientes";

describe("pacienteDeSemilla", () => {
  it("es determinista", () => {
    expect(pacienteDeSemilla("abc")).toEqual(pacienteDeSemilla("abc"));
  });

  it("devuelve nombre y apellido y conserva la semilla", () => {
    const p = pacienteDeSemilla("xyz");
    expect(p.seed).toBe("xyz");
    expect(p.nombre.split(" ").length).toBeGreaterThanOrEqual(2);
  });

  it("semillas distintas varían los nombres", () => {
    const nombres = new Set(Array.from({ length: 30 }, (_, i) => pacienteDeSemilla(`s${i}`).nombre));
    expect(nombres.size).toBeGreaterThan(10);
  });
});

describe("pacientesDeRonda", () => {
  it("es determinista para la misma semilla", () => {
    expect(pacientesDeRonda("ronda-1")).toEqual(pacientesDeRonda("ronda-1"));
  });

  it("no repite nombres ni semillas en 10 pacientes", () => {
    for (const seed of ["a", "b", "ronda-1", "ronda-2", "zzz"]) {
      const ronda = pacientesDeRonda(seed, 10);
      expect(ronda).toHaveLength(10);
      expect(new Set(ronda.map((p) => p.nombre)).size).toBe(10);
      expect(new Set(ronda.map((p) => p.seed)).size).toBe(10);
    }
  });

  it("rechaza más pacientes de los nombres posibles", () => {
    expect(() => pacientesDeRonda("x", 401)).toThrow(RangeError);
  });
});
