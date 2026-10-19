import { describe, expect, it } from "vitest";
import { armarPodio, formatearHoraFeria, type FilaPodio } from "./podio";

const N = 0.1;
const E = 0.01;

function fila(over: Partial<FilaPodio> & Pick<FilaPodio, "jugador">): FilaPodio {
  return {
    prevalencia: N,
    puntaje: 500,
    tiempoTotalMs: 60_000,
    creada_en: "2026-10-20T15:00:00.000Z",
    dueno: null,
    ...over,
  };
}

describe("armarPodio: orden", () => {
  it("ordena por puntaje, luego por menor tiempo total, luego por quien jugó primero", () => {
    const p = armarPodio([
      fila({ jugador: "C", puntaje: 500, tiempoTotalMs: 90_000 }),
      fila({ jugador: "A", puntaje: 600, tiempoTotalMs: 120_000 }),
      fila({ jugador: "B", puntaje: 500, tiempoTotalMs: 60_000 }),
      fila({ jugador: "D", puntaje: 400, tiempoTotalMs: 10_000 }),
    ]);
    expect(p.normal.map((x) => x.jugador)).toEqual(["A", "B", "C"]);
    expect(p.normal.map((x) => x.posicion)).toEqual([1, 2, 3]);
  });

  it("con igual puntaje y tiempo gana quien jugó antes, sin marcar empate si no hay igualdad completa", () => {
    const p = armarPodio([
      fila({ jugador: "Tarde", creada_en: "2026-10-20T16:00:00.000Z" }),
      fila({ jugador: "Temprano", creada_en: "2026-10-20T15:00:00.000Z" }),
      fila({ jugador: "Otro", puntaje: 300, tiempoTotalMs: 1 }),
    ]);
    expect(p.normal[0].jugador).toBe("Temprano");
    expect(p.normal[1].jugador).toBe("Tarde");
  });

  it("un tiempo total desconocido queda detrás de cualquier tiempo conocido", () => {
    const p = armarPodio([
      fila({ jugador: "Sin tiempo", tiempoTotalMs: null }),
      fila({ jugador: "Con tiempo", tiempoTotalMs: 999_000 }),
    ]);
    expect(p.normal.map((x) => x.jugador)).toEqual(["Con tiempo", "Sin tiempo"]);
  });

  it("separa los modos normal y experto", () => {
    const p = armarPodio([
      fila({ jugador: "Normal", prevalencia: N, puntaje: 100 }),
      fila({ jugador: "Experto", prevalencia: E, puntaje: 900 }),
    ]);
    expect(p.normal.map((x) => x.jugador)).toEqual(["Normal"]);
    expect(p.experto.map((x) => x.jugador)).toEqual(["Experto"]);
  });
});

describe("armarPodio: empates", () => {
  it("marca empate a las dos filas con mismo puntaje y tiempo", () => {
    const p = armarPodio([
      fila({ jugador: "A", puntaje: 700, tiempoTotalMs: 50_000 }),
      fila({ jugador: "B", puntaje: 600, tiempoTotalMs: 50_000 }),
      fila({ jugador: "C", puntaje: 600, tiempoTotalMs: 50_000, creada_en: "2026-10-20T17:00:00.000Z" }),
    ]);
    expect(p.normal.map((x) => [x.jugador, x.empate])).toEqual([
      ["A", false],
      ["B", true],
      ["C", true],
    ]);
    expect(p.hayEmpate).toBe(true);
  });

  it("marca el empate entre el 3.º y el 4.º, que está fuera del podio", () => {
    const p = armarPodio([
      fila({ jugador: "A", puntaje: 700 }),
      fila({ jugador: "B", puntaje: 600 }),
      fila({ jugador: "C", puntaje: 500 }),
      fila({ jugador: "D", puntaje: 500, creada_en: "2026-10-20T16:00:00.000Z" }),
    ]);
    expect(p.normal).toHaveLength(3);
    expect(p.normal[2]).toMatchObject({ jugador: "C", empate: true });
    expect(p.hayEmpate).toBe(true);
  });

  it("no marca empate cuando solo coincide el puntaje", () => {
    const p = armarPodio([
      fila({ jugador: "A", puntaje: 500, tiempoTotalMs: 10_000 }),
      fila({ jugador: "B", puntaje: 500, tiempoTotalMs: 20_000 }),
    ]);
    expect(p.normal.every((x) => !x.empate)).toBe(true);
    expect(p.hayEmpate).toBe(false);
  });

  it("no marca empate entre dos filas de modos distintos", () => {
    const p = armarPodio([
      fila({ jugador: "A", prevalencia: N, puntaje: 500, tiempoTotalMs: 10_000 }),
      fila({ jugador: "B", prevalencia: E, puntaje: 500, tiempoTotalMs: 10_000 }),
    ]);
    expect(p.normal[0].empate).toBe(false);
    expect(p.experto[0].empate).toBe(false);
  });
});

describe("armarPodio: pocos jugadores", () => {
  it("sin jugadores devuelve podios vacíos", () => {
    expect(armarPodio([])).toEqual({ normal: [], experto: [], hayEmpate: false, hayMismoDispositivo: false });
  });

  it("con uno o dos jugadores devuelve solo esos puestos", () => {
    const p = armarPodio([fila({ jugador: "Solo" }), fila({ jugador: "Dos", puntaje: 100 }), fila({ jugador: "Exp", prevalencia: E })]);
    expect(p.normal.map((x) => [x.posicion, x.jugador])).toEqual([
      [1, "Solo"],
      [2, "Dos"],
    ]);
    expect(p.experto.map((x) => [x.posicion, x.jugador])).toEqual([[1, "Exp"]]);
  });
});

describe("armarPodio: mismo dispositivo", () => {
  it("avisa cuando el mismo dueño ocupa puestos en los dos podios", () => {
    const p = armarPodio([
      fila({ jugador: "Normal", prevalencia: N, puntaje: 700, dueno: "disp-1" }),
      fila({ jugador: "Otro", prevalencia: N, puntaje: 300, dueno: "disp-2" }),
      fila({ jugador: "Experto", prevalencia: E, puntaje: 700, dueno: "disp-1" }),
    ]);
    expect(p.normal[0]).toMatchObject({ jugador: "Normal", mismoDispositivo: true });
    expect(p.normal[1]).toMatchObject({ jugador: "Otro", mismoDispositivo: false });
    expect(p.experto[0]).toMatchObject({ jugador: "Experto", mismoDispositivo: true });
    expect(p.hayMismoDispositivo).toBe(true);
  });

  it("avisa también cuando el mismo dueño tiene dos puestos dentro del mismo podio", () => {
    const p = armarPodio([
      fila({ jugador: "Uno", puntaje: 700, dueno: "disp-1" }),
      fila({ jugador: "Dos", puntaje: 600, dueno: "disp-1" }),
      fila({ jugador: "Tres", puntaje: 500, dueno: "disp-3" }),
    ]);
    expect(p.normal.map((x) => x.mismoDispositivo)).toEqual([true, true, false]);
  });

  it("no avisa por dueños distintos ni por filas sin reserva", () => {
    const p = armarPodio([
      fila({ jugador: "A", prevalencia: N, puntaje: 700, dueno: "disp-1" }),
      fila({ jugador: "B", prevalencia: E, puntaje: 700, dueno: "disp-2" }),
      fila({ jugador: "C", prevalencia: E, puntaje: 600, dueno: null }),
      fila({ jugador: "D", prevalencia: N, puntaje: 600, dueno: null }),
    ]);
    expect(p.hayMismoDispositivo).toBe(false);
  });

  it("no expone el dueño en los puestos", () => {
    const p = armarPodio([fila({ jugador: "A", dueno: "secreto" })]);
    expect(JSON.stringify(p)).not.toContain("secreto");
  });
});

describe("formatearHoraFeria", () => {
  it("muestra la hora en Managua (UTC-6, sin horario de verano)", () => {
    expect(formatearHoraFeria("2026-10-20T00:05:00.000Z")).toBe("19/10 18:05");
    expect(formatearHoraFeria("2026-10-20T18:00:00-06:00")).toBe("20/10 18:00");
  });

  it("devuelve un guion para una fecha inválida", () => {
    expect(formatearHoraFeria("no es fecha")).toBe("—");
  });
});
