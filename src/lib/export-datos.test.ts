import { describe, expect, it } from "vitest";
import { construirDificultad, enAlcanceFeria } from "./export-datos";
import type { FilaRespuestaExport } from "./export-xlsx";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "./stats";

function fila(extra: Partial<FilaRespuestaExport> = {}): FilaRespuestaExport {
  return {
    partidaId: "11111111-1111-4111-8111-111111111111",
    creadaEn: new Date("2026-10-20T15:00:00Z"),
    jugador: "Ana",
    prevalencia: PREVALENCIA,
    puntaje: 8,
    tiempoTotalMs: 60_000,
    primerIntento: true,
    enInforme: true,
    orden: 1,
    evidencia: "protegido",
    estimacionPct: null,
    decision: "aislar",
    estabaInfectado: false,
    tiempoMs: 6_000,
    ...extra,
  };
}

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";

describe("enAlcanceFeria", () => {
  it("excluye lo anterior a la temporada y lo posterior al cierre", () => {
    const cierre = new Date("2026-10-20T18:00:00-06:00");
    expect(enAlcanceFeria(new Date("2026-10-18T23:59:59Z"), null)).toBe(false);
    expect(enAlcanceFeria(new Date("2026-10-19T00:00:00Z"), null)).toBe(true);
    expect(enAlcanceFeria(new Date("2026-10-21T00:00:00Z"), null)).toBe(true);
    expect(enAlcanceFeria(new Date("2026-10-21T00:00:00Z"), cierre)).toBe(true); // justo en el cierre
    expect(enAlcanceFeria(new Date("2026-10-21T00:00:01Z"), cierre)).toBe(false);
    expect(enAlcanceFeria(new Date("2026-10-20T00:00:00Z"), cierre)).toBe(true);
  });
});

describe("construirDificultad", () => {
  it("cuenta partidas, jugadores (primer intento), puntaje promedio y decisiones", () => {
    const rs = [
      fila({ partidaId: P1, orden: 1, puntaje: 8 }),
      fila({ partidaId: P1, orden: 2, evidencia: "conviviente", decision: "liberar", estabaInfectado: true, puntaje: 8 }),
      fila({ partidaId: P2, jugador: "Beto", primerIntento: true, puntaje: 6, evidencia: "conviviente", decision: "aislar" }),
      fila({ partidaId: P3, jugador: "Ana", primerIntento: false, puntaje: 10, evidencia: "conviviente", decision: "aislar" }),
      fila({ partidaId: P1, prevalencia: PREVALENCIA_EXPERTO }),
    ];
    const d = construirDificultad(PREVALENCIA, "Normal", rs, [], null);
    expect(d.partidas).toBe(3);
    expect(d.jugadores).toBe(2);
    expect(d.puntajePromedio).toBe(7); // (8 + 6) / 2: solo primeros intentos
    expect(d.totalCasos).toBe(3); // P3 es segundo intento: no cuenta en decisiones
    expect(d.decisiones.find((f) => f.evidencia === "conviviente")).toMatchObject({ casos: 2, pctAislo: 0.5 });
    expect(d.decisiones.find((f) => f.evidencia === "protegido")).toMatchObject({ casos: 1, pctAislo: 1 });
    expect(d.lecturas.length).toBeGreaterThan(0);
  });

  it("respeta la hora de cierre y la temporada", () => {
    const cierre = new Date("2026-10-20T18:00:00-06:00");
    const rs = [
      fila({ partidaId: P1, creadaEn: new Date("2026-10-18T10:00:00Z") }),
      fila({ partidaId: P2, creadaEn: new Date("2026-10-21T00:30:00Z"), jugador: "Tarde" }),
      fila({ partidaId: P3, creadaEn: new Date("2026-10-20T15:00:00Z"), jugador: "Temprano" }),
    ];
    const d = construirDificultad(PREVALENCIA, "Normal", rs, [], cierre);
    expect(d.partidas).toBe(1);
    expect(d.jugadores).toBe(1);
  });

  it("sin datos devuelve cifras vacías y una lectura explicativa", () => {
    const d = construirDificultad(PREVALENCIA_EXPERTO, "Experto", [], [], null);
    expect(d).toMatchObject({ partidas: 0, jugadores: 0, puntajePromedio: null, totalCasos: 0, pctOptimasTotal: null });
    expect(d.lecturas).toEqual(["Sin decisiones registradas en esta modalidad todavía."]);
    expect(d.histograma.every((c) => c.cantidad === 0)).toBe(true);
  });

  it("las estimaciones antiguas solo alimentan el histograma", () => {
    const rs = [fila({ estimacionPct: 35 }), fila({ partidaId: P2, jugador: "B", estimacionPct: 36 })];
    const d = construirDificultad(PREVALENCIA, "Normal", rs, [], null);
    expect(d.histograma[3].cantidad).toBe(2);
  });
});
