import { describe, expect, it } from "vitest";
import {
  ANGULO_PUERTA_ABIERTA,
  anguloPuerta,
  DURACION_PUERTA_MS,
  puertaAbierta,
  RETRASO_PUERTA_MS,
  webglDisponible,
} from "./consultorio3d";

describe("anguloPuerta (bisagra de la puerta, S3)", () => {
  it("espera un respiro con la puerta cerrada: la foto inicial es determinista", () => {
    expect(RETRASO_PUERTA_MS).toBeGreaterThanOrEqual(200);
    expect(anguloPuerta(0)).toBe(0);
    expect(anguloPuerta(RETRASO_PUERTA_MS - 50)).toBe(0);
    // ...y después abre del todo: el giro completo termina al final de la ventana.
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(ANGULO_PUERTA_ABIERTA);
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS + 5000)).toBe(ANGULO_PUERTA_ABIERTA);
  });

  it("la ventana activa dura ~1.5 s y termina del todo abierta", () => {
    expect(DURACION_PUERTA_MS).toBe(1500);
    expect(anguloPuerta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(ANGULO_PUERTA_ABIERTA);
  });

  it("gira siempre hacia adentro, sin rebotes", () => {
    const muestras = [300, 550, 800, 1050, 1300, 1550, 1800].map(anguloPuerta);
    for (let i = 1; i < muestras.length; i++) {
      expect(muestras[i]).toBeLessThan(muestras[i - 1]);
    }
  });

  it("es ease-out: a mitad de la ventana activa ya pasó más de mitad del giro", () => {
    expect(Math.abs(anguloPuerta(RETRASO_PUERTA_MS + 750))).toBeGreaterThan(
      Math.abs(ANGULO_PUERTA_ABIERTA) / 2,
    );
  });
});

describe("puertaAbierta", () => {
  it("la primera tarjeta espera a la puerta del todo abierta", () => {
    expect(puertaAbierta(0)).toBe(false);
    expect(puertaAbierta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS - 1)).toBe(false);
    expect(puertaAbierta(RETRASO_PUERTA_MS + DURACION_PUERTA_MS)).toBe(true);
  });
});

describe("webglDisponible (fallback S10)", () => {
  it("en Node (sin document) informa que no hay WebGL", () => {
    expect(webglDisponible()).toBe(false);
  });
});
