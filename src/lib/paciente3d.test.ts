import { describe, expect, it } from "vitest";
import {
  debeAvisarLlegada,
  DURACION_ENTRADA_MS,
  DURACION_SALIDA_MS,
  fasePaciente,
  pasoWalk,
  posPaciente,
} from "./paciente3d";

describe("paciente 3D: recorrido dirigido por el turno (S4, S5, S7, S9)", () => {
  it("entra, avisa la llegada una sola vez y espera la decisión", () => {
    expect([DURACION_ENTRADA_MS, DURACION_SALIDA_MS]).toEqual([2000, 2000]);
    let avisado = false;
    let llegadas = 0;
    for (const t of [0, DURACION_ENTRADA_MS - 1, DURACION_ENTRADA_MS, DURACION_ENTRADA_MS + 1000]) {
      if (debeAvisarLlegada(t, avisado, false, false)) {
        avisado = true;
        llegadas++;
      }
    }
    expect(llegadas).toBe(1);
    expect(fasePaciente(0, false)).toBe("entrando");
    expect(fasePaciente(DURACION_ENTRADA_MS - 1, false)).toBe("entrando");
    expect(fasePaciente(DURACION_ENTRADA_MS, false)).toBe("atendiendo");
    expect(fasePaciente(60_000, false)).toBe("atendiendo");
    expect(posPaciente(0, false)).toEqual([0, 0, -3.6]);
    expect(posPaciente(DURACION_ENTRADA_MS, false)).toEqual([0, 0, 0]);
    expect(posPaciente(60_000, false)).toEqual([0, 0, 0]);
  });

  it("sale desde el escritorio hacia la puerta solo al recibir saliendo", () => {
    expect(fasePaciente(0, true)).toBe("saliendo");
    expect(fasePaciente(DURACION_SALIDA_MS - 1, true)).toBe("saliendo");
    expect(fasePaciente(DURACION_SALIDA_MS, true)).toBe("fuera");
    const salida = Array.from({ length: 9 }, (_, i) => posPaciente(i * 250, true)[2]);
    expect(salida[0]).toBe(0);
    expect(salida.at(-1)).toBe(-3.6);
    for (let i = 1; i < salida.length; i++) expect(salida[i]).toBeLessThan(salida[i - 1]);
    expect(posPaciente(60_000, true)).toEqual([0, 0, -3.6]);
  });

  it("al remontar inicia una nueva entrada, sin reciclar el tiempo anterior", () => {
    expect(fasePaciente(60_000, false)).toBe("atendiendo");
    expect(fasePaciente(0, false)).toBe("entrando");
    expect(posPaciente(0, false)).toEqual([0, 0, -3.6]);
    expect(debeAvisarLlegada(0, false, false, false)).toBe(false);
    expect(debeAvisarLlegada(DURACION_ENTRADA_MS, false, false, false)).toBe(true);
  });

  it("sin movimiento aparece en el escritorio y avisa de inmediato", () => {
    expect(posPaciente(0, false, true)).toEqual([0, 0, 0]);
    expect(fasePaciente(0, false, true)).toBe("atendiendo");
    expect(debeAvisarLlegada(0, false, true, false)).toBe(true);
    expect(debeAvisarLlegada(0, true, true, false)).toBe(false);
    expect(debeAvisarLlegada(0, false, true, true)).toBe(false);
    expect(fasePaciente(0, true, true)).toBe("fuera");
  });

  it("entra monotónicamente con suavizado y ofrece paso finito para extremidades", () => {
    const entrada = Array.from({ length: 9 }, (_, i) => posPaciente(i * 250, false)[2]);
    for (let i = 1; i < entrada.length; i++) expect(entrada[i]).toBeGreaterThan(entrada[i - 1]);
    expect(entrada[1] - entrada[0]).toBeLessThan(entrada[4] - entrada[3]);
    expect(Number.isFinite(pasoWalk(0))).toBe(true);
    expect(pasoWalk(250)).toBeGreaterThan(pasoWalk(0));
  });
});
