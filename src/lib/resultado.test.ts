import { describe, expect, it } from "vitest";
import { PREVALENCIA_EXPERTO, puntajePartida, vppBayes } from "./stats";
import { UMBRAL_PUNTAJE_ALTO, calcularResultado, distribuirPuntos, puntajeMaximo, type EntradaResultado } from "./resultado";

const estim = [33, 33, 33, 33, 33, 33, 33, 33, 33, 33];

function entrada(over: Partial<EntradaResultado> = {}): EntradaResultado {
  return {
    modo: "normal",
    ronda: estim.map((_, i) => ({ orden: i + 1, nombre: `P${i + 1}`, evidencia: i < 3 ? "sin-antecedentes" as const : "protegido" as const })),
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
  it("lee evidencia, previo y posterior según modalidad, y puntúa valor esperado incluso si no acierta la infección", () => {
    const ronda = [{ orden: 1, nombre: "P1", evidencia: "protegido" as const }, { orden: 2, nombre: "P2", evidencia: "contacto" as const }];
    const respuestas = [
      { orden: 1, estimacion_pct: null, decision: "liberar" as const, estaba_infectado: true },
      { orden: 2, estimacion_pct: null, decision: "aislar" as const, estaba_infectado: false },
    ];
    const normal = calcularResultado(entrada({ ronda, respuestas, puntajeServidor: 0 }));
    expect(normal.filas[0]).toMatchObject({ evidencia: "protegido", previo: 0.04, puntos: 1, decisionAcertada: false });
    expect(normal.filas[0].posterior).toBeCloseTo(0.036 / 0.228);
    expect(normal.filas[1]).toMatchObject({ evidencia: "contacto", previo: 0.25, puntos: 1, decisionAcertada: false });
    expect(normal.puntajeTotal).toBe(2);
    const experto = calcularResultado(entrada({ modo: "experto", ronda, respuestas }));
    expect(experto.filas[1]).toMatchObject({ evidencia: "contacto", previo: 0.05, puntos: 0 });
    expect(experto.filas[1].posterior).toBeCloseTo(0.045 / 0.235);
    expect(experto.puntajeTotal).toBe(1);
  });

  it("ronda legacy sin evidencia usa sin antecedentes y no falla", () => {
    const r = calcularResultado(entrada({ ronda: [{ orden: 1, nombre: "P1" }], respuestas: [entrada().respuestas[0]] }));
    expect(r.filas[0]).toMatchObject({ evidencia: "sin-antecedentes", previo: 0.1, puntos: 1 });
  });
  it("reutiliza stats.ts para el puntaje total", () => {
    const e = entrada();
    const r = calcularResultado(e);
    expect(r.puntajeTotal).toBe(puntajePartida(e.respuestas, { modo: e.modo, ronda: e.ronda }));
    expect(r.filas.reduce((a, f) => a + f.puntos, 0)).toBe(r.puntajeTotal);
    expect(r.infectadosEnRonda).toBe(3);
    expect(r.vppTeoricoPct).toBeCloseTo(vppBayes(0.1) * 100, 6);
    expect(r.estimacionPromedioPct).toBe(33);
  });

  it("filas con desglose", () => {
    const f = calcularResultado(entrada()).filas[0];
    expect(f).toMatchObject({ orden: 1, nombre: "P1", estimacionPct: 33, decisionAcertada: true, puntos: 1 });
    const mal = calcularResultado(
      entrada({ respuestas: entrada().respuestas.map((x) => ({ ...x, decision: "aislar" as const })) }),
    ).filas[5];
    expect(mal.decisionAcertada).toBe(false);
    expect(mal.puntos).toBe(0);
  });

  it("muestra aciertos sin intuición cuando toda la ronda carece de estimación", () => {
    const e = entrada({ respuestas: entrada().respuestas.map((r) => ({ ...r, estimacion_pct: null })) });
    const r = calcularResultado(e);
    expect(r.puntajeTotal).toBe(10);
    expect(r.estimacionPromedioPct).toBeNull();
    expect(r.filas[0]).toMatchObject({ estimacionPct: null, puntos: 1 });
    expect(r.filas.every((f) => f.puntos === 1)).toBe(true);
  });

  it("no usa un puntaje del servidor desfasado respecto a la evidencia", () => {
    expect(calcularResultado(entrada({ puntajeServidor: 0 })).puntajeTotal).toBe(10);
    expect(calcularResultado(entrada({ puntajeServidor: 777 })).puntajeTotal).toBe(10);
  });

  it("10/10 sin estimaciones gana perfecto y cazador si aisló a todos los infectados", () => {
    const nueva = entrada({ respuestas: entrada().respuestas.map((r) => ({ ...r, estimacion_pct: null })) });
    const r = calcularResultado(nueva);
    expect(r.insignias.map((i) => i.id)).toEqual(["perfecto", "cazador"]);
    expect(r.insignias[0].titulo).toBe("Ronda perfecta");
    expect(r.insignias.some((i) => i.id === "bayesiano-nato")).toBe(false);
  });

  it("8 o 9 decisiones óptimas ganan ojo clínico, pero 7 no gana insignias de puntaje", () => {
    const nueva = entrada({ respuestas: entrada().respuestas.map((r) => ({ ...r, estimacion_pct: null })) });
    const conErrores = (n: number) => calcularResultado({
      ...nueva,
      respuestas: nueva.respuestas.map((r, i) => i < n ? { ...r, decision: r.decision === "aislar" ? "liberar" as const : "aislar" as const } : r),
    });
    expect(conErrores(1).insignias.map((i) => i.id)).toContain("ojo-clinico");
    expect(conErrores(2).insignias.map((i) => i.id)).toContain("ojo-clinico");
    expect(conErrores(3).insignias.map((i) => i.id)).toEqual([]);
  });

  it("filas legacy conservan su insignia de estimación junto a las nuevas", () => {
    expect(calcularResultado(entrada()).insignias.map((i) => i.id)).toEqual(["perfecto", "cazador", "bayesiano-nato"]);
    const sinEstimaciones = entrada({ respuestas: entrada().respuestas.map((r) => ({ ...r, estimacion_pct: null })) });
    expect(calcularResultado(sinEstimaciones).estimacionPromedioPct).toBeNull();
  });

  it("ronda vacía no gana insignias ni se celebra como puntaje alto", () => {
    const r = calcularResultado(entrada({ ronda: [], respuestas: [] }));
    expect(r.insignias).toEqual([]);
    expect(r.esPuntajeAlto).toBe(false);
  });

  it("puntaje alto comienza en 8 de 10 decisiones óptimas", () => {
    expect(puntajeMaximo()).toBe(10);
    expect(UMBRAL_PUNTAJE_ALTO).toBe(0.8);
    const nueva = entrada({ respuestas: entrada().respuestas.map((r) => ({ ...r, estimacion_pct: null })) });
    expect(calcularResultado({ ...nueva, puntajeServidor: 8 }).esPuntajeAlto).toBe(true);
    const conErrores = (n: number) => calcularResultado({
      ...nueva,
      respuestas: nueva.respuestas.map((r, i) => i < n ? { ...r, decision: "liberar" as const } : r),
    });
    expect(conErrores(2).esPuntajeAlto).toBe(true);
    expect(conErrores(3).esPuntajeAlto).toBe(false);
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
