import { describe, expect, it } from "vitest";
import {
  DURACION_ENTRADA_MS,
  DURACION_SALIDA_MS,
  ESPERA_MS,
  fasePaciente,
  PAUSA_MS,
  pasoWalk,
  posPaciente,
} from "./paciente3d";

const CICLO_MS = DURACION_ENTRADA_MS + ESPERA_MS + DURACION_SALIDA_MS + PAUSA_MS;

describe("paciente 3D: ciclo de demostración (S4, S5)", () => {
  it("cambia de fase en los límites y vuelve a entrar tras la pausa", () => {
    expect([DURACION_ENTRADA_MS, ESPERA_MS, DURACION_SALIDA_MS, PAUSA_MS]).toEqual([
      2000, 2500, 2000, 1000,
    ]);
    expect(fasePaciente(0)).toBe("entrando");
    expect(fasePaciente(DURACION_ENTRADA_MS - 1)).toBe("entrando");
    expect(fasePaciente(DURACION_ENTRADA_MS)).toBe("atendiendo");
    expect(fasePaciente(DURACION_ENTRADA_MS + ESPERA_MS - 1)).toBe("atendiendo");
    expect(fasePaciente(DURACION_ENTRADA_MS + ESPERA_MS)).toBe("saliendo");
    expect(fasePaciente(CICLO_MS - PAUSA_MS - 1)).toBe("saliendo");
    expect(fasePaciente(CICLO_MS - PAUSA_MS)).toBe("fuera");
    expect(fasePaciente(CICLO_MS - 1)).toBe("fuera");
    expect(fasePaciente(CICLO_MS)).toBe("entrando");
  });

  it("sale de la puerta, se detiene en el escritorio y vuelve a la puerta", () => {
    expect(posPaciente(0)).toEqual([0, 0, -3.6]);
    expect(posPaciente(DURACION_ENTRADA_MS)).toEqual([0, 0, 0]);
    expect(posPaciente(DURACION_ENTRADA_MS + ESPERA_MS)).toEqual([0, 0, 0]);
    expect(posPaciente(CICLO_MS - PAUSA_MS)).toEqual([0, 0, -3.6]);
    expect(posPaciente(CICLO_MS - 1)).toEqual([0, 0, -3.6]);
  });

  it("avanza monotónicamente con suavizado y retrocede al salir", () => {
    const entrada = Array.from({ length: 9 }, (_, i) => posPaciente(i * 250)[2]);
    for (let i = 1; i < entrada.length; i++) expect(entrada[i]).toBeGreaterThan(entrada[i - 1]);
    expect(entrada[1] - entrada[0]).toBeLessThan(entrada[4] - entrada[3]);
    const salida = Array.from({ length: 9 }, (_, i) => posPaciente(4500 + i * 250)[2]);
    for (let i = 1; i < salida.length; i++) expect(salida[i]).toBeLessThan(salida[i - 1]);
  });

  it("repite el recorrido completo tras 7.5 s", () => {
    expect(posPaciente(CICLO_MS)).toEqual(posPaciente(0));
    expect(posPaciente(CICLO_MS + 900)).toEqual(posPaciente(900));
    expect(fasePaciente(CICLO_MS + 2100)).toBe("atendiendo");
  });

  it("ofrece una fase de paso finita y que avanza durante la caminata", () => {
    expect(Number.isFinite(pasoWalk(0))).toBe(true);
    expect(pasoWalk(250)).toBeGreaterThan(pasoWalk(0));
  });
});
