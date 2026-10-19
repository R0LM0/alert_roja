import { describe, expect, it } from "vitest";
import { resolverInsignias } from "./insignias";
import {
  compararRanking,
  construirHistograma,
  enTemporadaActual,
  ETIQUETA_TEMPORADA_ACTUAL,
  formatearTiempoTotal,
  INICIO_TEMPORADA_ACTUAL,
  informacionInsignias,
  NOMBRE_TEMPORADA_ACTUAL,
  normalizarApodo,
  seleccionarPrimerosIntentos,
} from "./ranking";

describe("temporada actual del ranking", () => {
  it("define la temporada de decisiones y explica el archivo histórico", () => {
    expect(INICIO_TEMPORADA_ACTUAL).toBe("2026-10-19T00:00:00.000Z");
    expect(NOMBRE_TEMPORADA_ACTUAL).toBe("Decisiones");
    expect(ETIQUETA_TEMPORADA_ACTUAL).toBe(
      "Temporada actual: decisiones (desde el 19/10/2026). Las partidas anteriores quedan archivadas.",
    );
  });
  it("excluye las partidas anteriores al inicio", () => {
    expect(enTemporadaActual("2026-10-18T23:59:59.999Z")).toBe(false);
  });
  it("incluye el instante exacto de inicio", () => {
    expect(enTemporadaActual("2026-10-19T00:00:00.000Z")).toBe(true);
  });
  it("incluye los instantes posteriores incluso con otra zona horaria", () => {
    expect(enTemporadaActual("2026-10-18T21:00:00.001-03:00")).toBe(true);
  });
  it("excluye fechas inválidas", () => {
    expect(enTemporadaActual("fecha inválida")).toBe(false);
  });
  it("mantiene el orden por puntaje aun entre partidas de distintas temporadas", () => {
    const antigua = { puntaje: 100, tiempoTotalMs: 50_000, creadaEn: "2026-10-18T23:59:59.999Z" };
    const actual = { puntaje: 10, tiempoTotalMs: 50_000, creadaEn: "2026-10-19T00:00:00.000Z" };
    expect(compararRanking(antigua, actual)).toBeLessThan(0);
  });
});

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

describe("informacionInsignias", () => {
  it("traduce los ids al título e icono del resultado en el mismo orden", () => {
    expect(informacionInsignias(["perfecto", "ojo-clinico", "cazador", "bayesiano-nato"])).toEqual([
      { id: "perfecto", titulo: "Ronda perfecta", icono: "smile" },
      { id: "ojo-clinico", titulo: "Ojo clínico", icono: "brain" },
      { id: "cazador", titulo: "Cazador de contagios", icono: "shield-check" },
      { id: "bayesiano-nato", titulo: "Bayesiano nato", icono: "brain" },
    ]);
  });
  it("ignora los ids desconocidos sin crear chips vacíos", () => {
    expect(informacionInsignias(["desconocido", "cazador"])).toEqual([
      { id: "cazador", titulo: "Cazador de contagios", icono: "shield-check" },
    ]);
  });
  it("usa los mismos títulos e iconos del catálogo y omite ids retirados", () => {
    const ids = ["ojo-clinico", "retirada", "perfecto"];
    expect(informacionInsignias(ids)).toEqual(resolverInsignias(ids).map(({ id, titulo, icono }) => ({ id, titulo, icono })));
  });
  it("devuelve una lista vacía si no hay insignias", () => {
    expect(informacionInsignias([])).toEqual([]);
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
