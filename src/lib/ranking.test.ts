import { describe, expect, it } from "vitest";
import { compararRanking, construirHistograma, formatearTiempoTotal, normalizarApodo, seleccionarPrimerosIntentos } from "./ranking";

describe("formatearTiempoTotal", () => {
  it("formatea m:ss", () => {
    expect(formatearTiempoTotal(83_000)).toBe("1:23");
    expect(formatearTiempoTotal(5_000)).toBe("0:05");
    expect(formatearTiempoTotal(0)).toBe("0:00");
    expect(formatearTiempoTotal(600_000)).toBe("10:00");
  });
  it("redondea al segundo más cercano", () => {
    expect(formatearTiempoTotal(59_600)).toBe("1:00");
    expect(formatearTiempoTotal(1_400)).toBe("0:01");
  });
  it("devuelve un guion si no hay dato", () => {
    expect(formatearTiempoTotal(null)).toBe("—");
    expect(formatearTiempoTotal(undefined)).toBe("—");
    expect(formatearTiempoTotal(Number.NaN)).toBe("—");
    expect(formatearTiempoTotal(-5)).toBe("—");
  });
});

describe("normalizarApodo", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizarApodo("  CHELA ")).toBe("chela");
    expect(normalizarApodo("Ana")).toBe(normalizarApodo("aNa  "));
  });
});

describe("compararRanking", () => {
  const base = { jugador: "a", puntaje: 100, tiempoTotalMs: 50_000, creadaEn: "2026-01-01T00:00:00.000Z" };
  it("mayor puntaje primero", () => {
    expect(compararRanking({ ...base, puntaje: 200 }, base)).toBeLessThan(0);
  });
  it("a igual puntaje gana el menor tiempo total", () => {
    expect(compararRanking({ ...base, tiempoTotalMs: 40_000 }, base)).toBeLessThan(0);
  });
  it("a igual puntaje y tiempo gana el más antiguo", () => {
    expect(compararRanking({ ...base, creadaEn: "2025-12-31T00:00:00.000Z" }, base)).toBeLessThan(0);
    expect(compararRanking(base, base)).toBe(0);
  });
  it("un tiempo desconocido va después", () => {
    expect(compararRanking({ ...base, tiempoTotalMs: null }, base)).toBeGreaterThan(0);
  });
});

describe("seleccionarPrimerosIntentos", () => {
  const f = (jugador: string, prevalencia: number, creadaEn: string) => ({ jugador, prevalencia, creadaEn });
  it("solo cuenta el primer intento por apodo y dificultad", () => {
    const filas = [
      f("Ana", 0.1, "2026-01-01T10:05:00Z"),
      f(" ana ", 0.1, "2026-01-01T10:00:00Z"),
      f("ANA", 0.01, "2026-01-01T10:09:00Z"),
      f("Luis", 0.1, "2026-01-01T10:01:00Z"),
    ];
    const r = seleccionarPrimerosIntentos(filas);
    expect(r.map((x) => x.creadaEn)).toEqual(["2026-01-01T10:00:00Z", "2026-01-01T10:09:00Z", "2026-01-01T10:01:00Z"]);
  });
});

describe("construirHistograma", () => {
  it("reparte en 10 cubetas y el 100 va a la última", () => {
    const h = construirHistograma([0, 9, 10, 33, 99, 100]);
    expect(h).toHaveLength(10);
    expect(h[0]).toEqual({ desde: 0, hasta: 9, cantidad: 2 });
    expect(h[3].cantidad).toBe(1);
    expect(h[9]).toEqual({ desde: 90, hasta: 100, cantidad: 2 });
  });
});
