import { describe, expect, it } from "vitest";
import {
  DURACION_EFECTO_S,
  dbAGanancia,
  envolvente,
  esperaAzar,
  esperaLatido,
  frecuenciaNota,
  NIVELES_AMBIENTE,
  NOTAS,
  puntosDucking,
  sonidoAzar,
  tiemposPasos,
} from "./ambiente";

describe("dbAGanancia", () => {
  it("0 dB es ganancia 1 y cada -6 dB la mitad aprox.", () => {
    expect(dbAGanancia(0)).toBeCloseTo(1, 6);
    expect(dbAGanancia(-6)).toBeCloseTo(0.501, 2);
    expect(dbAGanancia(-20)).toBeCloseTo(0.1, 6);
  });

  it("el ambiente queda por debajo de los efectos", () => {
    expect(dbAGanancia(NIVELES_AMBIENTE.sala)).toBeLessThan(dbAGanancia(-20));
    expect(dbAGanancia(NIVELES_AMBIENTE.latido)).toBeLessThan(1);
  });
});

describe("intervalos aleatorios", () => {
  it("latido del monitor entre 1,1 y 1,4 s", () => {
    expect(esperaLatido(() => 0)).toBe(1100);
    expect(esperaLatido(() => 0.999)).toBeLessThan(1400);
    expect(esperaLatido(() => 0.5)).toBeCloseTo(1250, 6);
  });

  it("sonido de azar entre 6 y 12 s", () => {
    expect(esperaAzar(() => 0)).toBe(6000);
    expect(esperaAzar(() => 0.999)).toBeLessThan(12000);
  });

  it("roce (60 %) o pasos (40 %) según el azar", () => {
    expect(sonidoAzar(() => 0.1)).toBe("roce");
    expect(sonidoAzar(() => 0.59)).toBe("roce");
    expect(sonidoAzar(() => 0.61)).toBe("pasos");
  });
});

describe("notas y tiempos", () => {
  it("A4 es 440 Hz y cada octava duplica la frecuencia", () => {
    expect(frecuenciaNota(0)).toBeCloseTo(440, 6);
    expect(frecuenciaNota(12)).toBeCloseTo(880, 6);
    expect(frecuenciaNota(3)).toBeCloseTo(523.25, 2); // C5
  });

  it("pasos separados y en orden", () => {
    expect(tiemposPasos(3, 0.35, 0.25)).toEqual([0.35, 0.6, 0.85]);
    expect(tiemposPasos(0, 1, 1)).toEqual([]);
  });

  it("todo efecto dura menos de 1,2 s", () => {
    for (const [nombre, duracion] of Object.entries(DURACION_EFECTO_S)) {
      expect(duracion, nombre).toBeGreaterThan(0);
      expect(duracion, nombre).toBeLessThan(1.2);
    }
  });

  it("las notas de cada efecto caben en su duración", () => {
    expect(NOTAS.resultado).toHaveLength(4);
    expect(NOTAS.aislar).toHaveLength(2);
    expect(NOTAS.liberar).toHaveLength(2);
  });
});

describe("envolvente", () => {
  it("sube, cae y termina casi en cero (apta para rampas exponenciales)", () => {
    const [inicio, pico, fin] = envolvente(1, 0.2, 0.05);
    expect(inicio).toEqual({ t: 0, v: expect.any(Number) });
    expect(inicio.v).toBeGreaterThan(0);
    expect(pico).toEqual({ t: 0.05, v: 0.2 });
    expect(fin.t).toBe(1);
    expect(fin.v).toBeGreaterThan(0);
    expect(fin.v).toBeLessThan(0.001);
  });

  it("el ataque no pasa de la mitad de la duración", () => {
    const [, pico] = envolvente(0.1, 0.2, 0.5);
    expect(pico.t).toBeCloseTo(0.05, 6);
  });
});

describe("ducking", () => {
  it("baja el ambiente a -6 dB, lo sostiene y vuelve a 1", () => {
    const puntos = puntosDucking(0.5);
    const bajo = dbAGanancia(-6);
    expect(puntos[0]).toEqual({ t: 0, v: 1 });
    expect(puntos[1].v).toBeCloseTo(bajo, 6);
    expect(puntos[2]).toEqual({ t: 0.5, v: puntos[1].v });
    expect(puntos[3].v).toBe(1);
    expect(puntos[3].t).toBeCloseTo(0.5 + 0.8, 6);
  });

  it("los tiempos avanzan sin retroceder", () => {
    const puntos = puntosDucking(1.05);
    for (let i = 1; i < puntos.length; i++) {
      expect(puntos[i].t).toBeGreaterThanOrEqual(puntos[i - 1].t);
    }
  });
});
