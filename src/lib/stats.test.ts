import { describe, expect, it } from "vitest";
import {
  PREVALENCIA,
  PREVALENCIA_EXPERTO,
  frecuenciasNaturales,
  insignias,
  puntajePartida,
  puntajeRespuesta,
  resumir,
  sortearPositivo,
  vpnBayes,
  vppBayes,
  type Respuesta,
} from "./stats";

describe("stats", () => {
  it("VPP = 1/3 con el escenario del catálogo", () => {
    expect(vppBayes()).toBeCloseTo(1 / 3, 4);
  });

  it("VPN ≈ 0.9863", () => {
    expect(vpnBayes()).toBeCloseTo(0.9863, 4);
  });

  it("frecuencias naturales: 90 / 180 / 10 / 720", () => {
    expect(frecuenciasNaturales()).toEqual({ vp: 90, fp: 180, fn: 10, vn: 720 });
  });

  it("resumen sin datos no divide entre cero", () => {
    const r = resumir([]);
    expect(r.n).toBe(0);
    expect(r.vppObservadoPct).toBeNull();
  });

  it("ignora estimaciones nulas sin perder el conteo de decisiones", () => {
    const r = resumir([mk(null, "aislar", false), mk(60, "liberar", false), mk(null, "aislar", true)]);
    expect(r).toMatchObject({ n: 3, estimacionPromedioPct: 60, pctSobreestiman: 100 });
    expect(r.pctAislados).toBeCloseTo(200 / 3);
    expect(resumir([mk(null, "liberar", true)]).estimacionPromedioPct).toBeNull();
    expect(resumir([mk(null, "liberar", true)]).pctSobreestiman).toBeNull();
  });

  it("resumen calcula promedio y VPP observado", () => {
    const r = resumir([
      { estimacion_pct: 90, decision: "aislar", estaba_infectado: true },
      { estimacion_pct: 70, decision: "aislar", estaba_infectado: false },
      { estimacion_pct: 50, decision: "liberar", estaba_infectado: false },
    ]);
    expect(r.estimacionPromedioPct).toBeCloseTo(70, 6);
    expect(r.vppObservadoPct).toBeCloseTo(33.33, 1);
    expect(r.aisladosSanos).toBe(1);
  });
});

describe("stats: prevalencia parametrizada", () => {
  it("VPP al 1% ≈ 0.0435 (0.009 / 0.207)", () => {
    expect(vppBayes(PREVALENCIA_EXPERTO)).toBeCloseTo(0.009 / 0.207, 6);
    expect(vppBayes(PREVALENCIA_EXPERTO)).toBeCloseTo(0.0435, 3);
  });

  it("frecuencias naturales al 1%: 9 / 198 / 1 / 792", () => {
    expect(frecuenciasNaturales(1000, PREVALENCIA_EXPERTO)).toEqual({ vp: 9, fp: 198, fn: 1, vn: 792 });
  });

  it("sortearPositivo respeta la prevalencia", () => {
    expect(sortearPositivo(() => 0.2, 0.1).infectado).toBe(true);
    expect(sortearPositivo(() => 0.2, PREVALENCIA_EXPERTO).infectado).toBe(false);
    expect(sortearPositivo(() => 0.3).infectado).toBe(true);
  });
});

describe("puntajeRespuesta", () => {
  it("100 cuando acierta el VPP exacto", () => {
    expect(puntajeRespuesta(33.3333, 33.3333)).toBe(100);
  });
  it("redondea 100 - |estimación - VPP|", () => {
    expect(puntajeRespuesta(78, (1 / 3) * 100)).toBe(55);
  });
  it("nunca baja de 0", () => {
    expect(puntajeRespuesta(100, 0)).toBe(0);
  });
  it("es simétrico: sobrestimar y subestimar por igual cuesta lo mismo", () => {
    expect(puntajeRespuesta(43, 33)).toBe(puntajeRespuesta(23, 33));
  });
});

const mk = (est: number | null, decision: "aislar" | "liberar", inf: boolean): Respuesta => ({
  estimacion_pct: est,
  decision,
  estaba_infectado: inf,
});

describe("puntajePartida", () => {
  it("suma un punto por decisión acorde a la realidad", () => {
    const rs = [mk(33, "aislar", true), mk(33, "liberar", false), mk(33, "aislar", false)];
    expect(puntajePartida(rs, PREVALENCIA)).toBe(2);
  });
  it("puntúa solo aciertos, sin importar estimaciones antiguas o nulas", () => {
    expect(puntajePartida([mk(null, "aislar", true), mk(90, "liberar", false), mk(33, "aislar", false)])).toBe(2);
  });
  it("sin respuestas = 0", () => {
    expect(puntajePartida([], PREVALENCIA)).toBe(0);
  });
});

describe("insignias", () => {
  const diez = (est: number | null, d: "aislar" | "liberar") => Array.from({ length: 10 }, () => mk(est, d, false));
  it("bayesiano-nato con promedio en [25, 40] solo cuando hay estimaciones", () => {
    const soloSanos = diez(null, "liberar");
    expect(insignias(soloSanos)).toEqual(["perfecto"]);
    expect(insignias([...soloSanos.slice(0, 9), mk(33, "liberar", false)])).toEqual(["perfecto", "bayesiano-nato"]);
  });
  it("cazador requiere infectados y haber aislado a todos", () => {
    const conInfectados = [mk(null, "aislar", true), mk(null, "aislar", true), ...diez(null, "liberar").slice(0, 8)];
    expect(insignias(conInfectados)).toEqual(["perfecto", "cazador"]);
    expect(insignias(diez(null, "liberar"))).toEqual(["perfecto"]);
    const sieteAciertos = [...conInfectados.slice(0, 2), ...diez(null, "aislar").slice(0, 3), ...diez(null, "liberar").slice(0, 5)];
    expect(insignias(sieteAciertos)).toEqual(["cazador"]);
    expect(insignias([{ ...conInfectados[0], decision: "liberar" }, ...conInfectados.slice(1)])).not.toContain("cazador");
  });
  it("ojo clínico solo con 8-9 aciertos de diez, perfecto solo con diez", () => {
    const todos = diez(null, "liberar");
    expect(insignias([{ ...todos[0], decision: "aislar" }, ...todos.slice(1)])).toEqual(["ojo-clinico"]);
    expect(insignias([...diez(null, "aislar").slice(0, 3), ...todos.slice(3)])).toEqual([]);
    expect(insignias(todos.slice(0, 9))).toEqual([]);
    expect(insignias([])).toEqual([]);
  });
  it("los límites 25 y 40 del promedio legacy son inclusivos; justo afuera no", () => {
    const conEstimacion = (est: number) => diez(est, "liberar");
    expect(insignias(conEstimacion(25))).toEqual(["perfecto", "bayesiano-nato"]);
    expect(insignias(conEstimacion(40))).toEqual(["perfecto", "bayesiano-nato"]);
    expect(insignias(conEstimacion(24))).toEqual(["perfecto"]);
    expect(insignias(conEstimacion(41))).toEqual(["perfecto"]);
  });
});
