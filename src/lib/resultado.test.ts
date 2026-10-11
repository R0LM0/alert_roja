import { describe, expect, it } from "vitest";
import { PREVALENCIA_EXPERTO, puntajePartida, vppBayes } from "./stats";
import { UMBRAL_PUNTAJE_ALTO, calcularResultado, distribuirPuntos, puntajeMaximo, type EntradaResultado } from "./resultado";

const estim = [33, 33, 33, 33, 33, 33, 33, 33, 33, 33];

function entrada(over: Partial<EntradaResultado> = {}): EntradaResultado {
  return {
    modo: "normal",
    ronda: estim.map((_, i) => ({ orden: i + 1, nombre: `P${i + 1}` })),
    respuestas: estim.map((e, i) => ({
      orden: i + 1,
      estimacion_pct: e,
      decision: i < 3 ? ("aislar" as const) : ("liberar" as const),
      estaba_infectado: i < 3,
    })),
    ...over,
  };
}

describe("calcularResultado", () => {
  it("reutiliza stats.ts para el puntaje total", () => {
    const e = entrada();
    const r = calcularResultado(e);
    expect(r.puntajeTotal).toBe(puntajePartida(e.respuestas, 0.1));
    expect(r.filas.reduce((a, f) => a + f.puntaje, 0)).toBe(r.puntajeTotal);
    expect(r.infectadosEnRonda).toBe(3);
    expect(r.vppTeoricoPct).toBeCloseTo(vppBayes(0.1) * 100, 6);
    expect(r.estimacionPromedioPct).toBe(33);
  });

  it("filas con desglose", () => {
    const f = calcularResultado(entrada()).filas[0];
    expect(f).toMatchObject({ orden: 1, nombre: "P1", estimacionPct: 33, decisionAcertada: true, bonoDecision: 20 });
    expect(f.puntajeEstimacion + f.bonoDecision).toBe(f.puntaje);
    const mal = calcularResultado(
      entrada({ respuestas: entrada().respuestas.map((x) => ({ ...x, decision: "aislar" as const })) }),
    ).filas[5];
    expect(mal.decisionAcertada).toBe(false);
    expect(mal.bonoDecision).toBe(0);
  });

  it("usa el puntaje del servidor si viene", () => {
    expect(calcularResultado(entrada({ puntajeServidor: 777 })).puntajeTotal).toBe(777);
  });

  it("insignias con metadatos", () => {
    const r = calcularResultado(entrada());
    expect(r.insignias.map((i) => i.id)).toEqual(["bayesiano-nato"]);
    expect(r.insignias[0].titulo).toBe("Bayesiano nato");
    const par = calcularResultado(
      entrada({ respuestas: entrada().respuestas.map((x) => ({ ...x, decision: "aislar" as const })) }),
    );
    expect(par.insignias.map((i) => i.titulo)).toContain("Paranoico");
    const conf = calcularResultado(
      entrada({ respuestas: entrada().respuestas.map((x) => ({ ...x, decision: "liberar" as const })) }),
    );
    expect(conf.insignias.map((i) => i.titulo)).toContain("Confiado");
  });

  it("puntaje alto desde el umbral", () => {
    expect(puntajeMaximo()).toBe(1200);
    expect(UMBRAL_PUNTAJE_ALTO).toBe(0.75);
    expect(calcularResultado(entrada({ puntajeServidor: 900 })).esPuntajeAlto).toBe(true);
    expect(calcularResultado(entrada({ puntajeServidor: 899 })).esPuntajeAlto).toBe(false);
  });

  it("mensaje clave normal y experto calculados", () => {
    expect(calcularResultado(entrada()).mensajeClave).toBe(
      "La prueba acierta 90 %, pero solo 1 de cada 3 positivos está enfermo",
    );
    const x = calcularResultado(entrada({ modo: "experto" }));
    expect(x.prevalencia).toBe(PREVALENCIA_EXPERTO);
    expect(x.mensajeClave).toBe("La prueba acierta 90 %, pero solo 1 de cada 23 positivos está enfermo");
    expect(x.frecuencias).toEqual({ vp: 9, fp: 198, fn: 1, vn: 792 });
  });
});

describe("distribuirPuntos", () => {
  it("coloca 1000 puntos en celdas únicas, agrupados por tabla 2x2", () => {
    const d = distribuirPuntos({ vp: 90, fp: 180, fn: 10, vn: 720 });
    expect(d.puntos).toHaveLength(1000);
    const unicas = (k: "mezclado" | "agrupado") => new Set(d.puntos.map((p) => `${p[k].x},${p[k].y}`)).size;
    expect(unicas("mezclado")).toBe(1000);
    expect(unicas("agrupado")).toBe(1000);
    expect(d.puntos.filter((p) => p.grupo === "VP")).toHaveLength(90);
    expect(d.puntos.every((p) => p.agrupado.x < d.columnas && p.agrupado.y < d.filas)).toBe(true);
    expect(d.puntos.every((p) => p.mezclado.x < d.columnas && p.mezclado.y < d.filas)).toBe(true);
  });
  it("funciona en modo experto", () => {
    const d = distribuirPuntos({ vp: 9, fp: 198, fn: 1, vn: 792 });
    expect(new Set(d.puntos.map((p) => `${p.agrupado.x},${p.agrupado.y}`)).size).toBe(1000);
  });
});
