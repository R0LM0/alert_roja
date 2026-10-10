import { describe, expect, it } from "vitest";
import { frecuenciasNaturales, resumir, vpnBayes, vppBayes } from "./stats";

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
