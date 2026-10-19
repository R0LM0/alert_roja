import { describe, expect, it } from "vitest";
import {
  debeAvisarLlegada,
  DURACION_ENTRADA_MS,
  DURACION_SALIDA_MS,
  fasePaciente,
  anguloSalida,
  alphaEntrada,
  coloresPaciente,
  derivarAspecto,
  pasoWalk,
  posPaciente,
  POS_CUARENTENA,
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

  it("aislar camina a un área de cuarentena a la izquierda, nunca a la puerta", () => {
    const inicio = posPaciente(0, true, false, "cuarentena");
    const puerta = posPaciente(DURACION_SALIDA_MS, true, false, "puerta");
    const destino = posPaciente(DURACION_SALIDA_MS, true, false, "cuarentena");
    expect(inicio).toEqual([0, 0, 0]);
    expect(destino).toEqual(POS_CUARENTENA);
    expect(destino).not.toEqual(puerta);
    expect(destino[0]).toBeLessThan(0);
    expect(destino[0]).toBeGreaterThan(-1.3); // visible a la izquierda también en un encuadre estrecho
    expect(destino[2]).toBeLessThan(-2); // zona distinta de la puerta, sin perderse detrás de la mesa
    expect(posPaciente(60_000, true, false, "cuarentena")).toEqual(destino);
    expect(puerta).toEqual([0, 0, -3.6]);

    for (const salida of ["cuarentena", "puerta"] as const) {
      let distanciaAnterior = 0;
      for (const t of [0, 250, 500, 750, 1000, 1250, 1500, 1750, DURACION_SALIDA_MS]) {
        const [x, , z] = posPaciente(t, true, false, salida);
        const distancia = Math.hypot(x, z);
        expect(distancia).toBeGreaterThanOrEqual(distanciaAnterior);
        distanciaAnterior = distancia;
      }
      expect(fasePaciente(DURACION_SALIDA_MS - 1, true)).toBe("saliendo");
      expect(fasePaciente(DURACION_SALIDA_MS, true)).toBe("fuera");
    }
  });

  it("con movimiento reducido no recorre pasos: ya está fuera en el destino elegido", () => {
    for (const salida of ["cuarentena", "puerta"] as const) {
      const destino = posPaciente(DURACION_SALIDA_MS, true, false, salida);
      for (const t of [0, 350, DURACION_SALIDA_MS]) {
        expect(fasePaciente(t, true, true)).toBe("fuera");
        expect(posPaciente(t, true, true, salida)).toEqual(destino);
      }
    }
  });

  it("gira gradualmente para mirar hacia cada destino mientras camina", () => {
    for (const salida of ["cuarentena", "puerta"] as const) {
      const [x, , z] = posPaciente(DURACION_SALIDA_MS, true, false, salida);
      const anguloDestino = Math.atan2(x, z);
      const anguloFinal = anguloSalida(DURACION_SALIDA_MS, salida);
      expect(Math.cos(anguloFinal)).toBeCloseTo(Math.cos(anguloDestino));
      expect(Math.sin(anguloFinal)).toBeCloseTo(Math.sin(anguloDestino));
      expect(anguloSalida(0, salida)).toBe(0);
      expect(Math.abs(anguloSalida(175, salida))).toBeGreaterThan(0);
      expect(Math.abs(anguloSalida(175, salida))).toBeLessThan(Math.abs(anguloFinal));
      expect(anguloSalida(350, salida)).toBeCloseTo(anguloFinal);
    }
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

  it("gira hacia la puerta durante 350 ms sin cambiar los dos segundos de salida", () => {
    expect(anguloSalida(0)).toBe(0);
    expect(anguloSalida(175)).toBeGreaterThan(0);
    expect(anguloSalida(175)).toBeLessThan(Math.PI);
    expect(anguloSalida(350)).toBeCloseTo(Math.PI);
    expect(anguloSalida(DURACION_SALIDA_MS)).toBeCloseTo(Math.PI);
    expect(fasePaciente(350, true)).toBe("saliendo");
  });

  it("aparece en la puerta durante 400 ms y sin movimiento aparece completo", () => {
    expect(alphaEntrada(0)).toBe(0);
    expect(alphaEntrada(200)).toBeCloseTo(0.5);
    expect(alphaEntrada(400)).toBe(1);
    expect(alphaEntrada(DURACION_ENTRADA_MS)).toBe(1);
    expect(alphaEntrada(0, true)).toBe(1);
  });

  it("deriva el mismo aspecto para la misma semilla y proporciones dentro de los límites", () => {
    const aspecto = derivarAspecto("paciente-1");
    expect(derivarAspecto("paciente-1")).toEqual(aspecto);
    for (let i = 0; i < 100; i++) {
      const { altura, contextura } = derivarAspecto(`paciente-${i}`);
      expect(altura).toBeGreaterThanOrEqual(1.35);
      expect(altura).toBeLessThanOrEqual(1.7);
      expect(contextura).toBeGreaterThanOrEqual(0.85);
      expect(contextura).toBeLessThanOrEqual(1.2);
    }
  });

  it("alcanza todos los peinados, tonos de pelo y atuendos con semillas distintas", () => {
    const aspectos = Array.from({ length: 100 }, (_, i) => derivarAspecto(`paciente-${i}`));
    expect(new Set(aspectos.map(({ pelo }) => pelo))).toEqual(new Set(["corto", "largo", "rizado"]));
    expect(new Set(aspectos.map(({ colorPelo }) => colorPelo)).size).toBe(3);
    expect(new Set(aspectos.map(({ atuendo }) => atuendo))).toEqual(new Set(["camisa", "bata", "chaleco"]));
    expect(new Set(aspectos.map(({ altura }) => altura)).size).toBeGreaterThan(1);
    expect(new Set(aspectos.map(({ contextura }) => contextura)).size).toBeGreaterThan(1);
  });

  it("el estado de infección no entra en el aspecto: solo se proporciona la semilla", () => {
    const seed = "paciente-neutral";
    const aspectos = [false, true].map(() => derivarAspecto(seed));
    expect(aspectos[0]).toEqual(aspectos[1]);
  });

  it("elige atuendo y piel deterministas por seed con variantes visibles", () => {
    const primero = coloresPaciente("paciente-1");
    expect(coloresPaciente("paciente-1")).toEqual(primero);
    const variantes = Array.from({ length: 80 }, (_, i) => coloresPaciente(`paciente-${i}`));
    expect(new Set(variantes.map(({ camisa }) => camisa)).size).toBe(5);
    expect(new Set(variantes.map(({ pantalon }) => pantalon)).size).toBe(4);
    expect(new Set(variantes.map(({ piel }) => piel)).size).toBe(4);
  });
});
