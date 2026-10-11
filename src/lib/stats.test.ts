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
});

const mk = (est: number, decision: "aislar" | "liberar", inf: boolean): Respuesta => ({
  estimacion_pct: est,
  decision,
  estaba_infectado: inf,
});

describe("puntajePartida", () => {
  it("suma puntaje por paciente y 20 por decisión acorde a la realidad", () => {
    const vpp = vppBayes(PREVALENCIA) * 100;
    const rs = [mk(33, "aislar", true), mk(33, "liberar", false), mk(33, "aislar", false)];
    const base = 3 * puntajeRespuesta(33, vpp);
    expect(puntajePartida(rs, PREVALENCIA)).toBe(base + 40);
  });
  it("sin respuestas = 0", () => {
    expect(puntajePartida([], PREVALENCIA)).toBe(0);
  });
});

describe("insignias", () => {
  const diez = (est: number, d: "aislar" | "liberar") => Array.from({ length: 10 }, () => mk(est, d, false));
  it("bayesiano-nato con promedio en [25, 40]", () => {
    expect(insignias([...diez(25, "aislar").slice(0, 5), ...diez(40, "liberar").slice(0, 5)], PREVALENCIA)).toContain(
      "bayesiano-nato",
    );
  });
  it("paranoico si aísla a los 10", () => {
    expect(insignias(diez(90, "aislar"), PREVALENCIA)).toEqual(["paranoico"]);
  });
  it("confiado si libera a los 10", () => {
    expect(insignias(diez(90, "liberar"), PREVALENCIA)).toEqual(["confiado"]);
  });
  it("ninguna si no cumple nada", () => {
    expect(insignias([...diez(90, "aislar").slice(0, 5), ...diez(90, "liberar").slice(0, 5)], PREVALENCIA)).toEqual([]);
  });
});
