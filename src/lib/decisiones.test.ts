import { describe, expect, it } from "vitest";
import { resumirDecisiones, type FilaDecision } from "./decisiones";

const f = (evidencia: FilaDecision["evidencia"], decision: FilaDecision["decision"], estaba_infectado = false): FilaDecision => ({
  evidencia,
  decision,
  estaba_infectado,
});

describe("resumirDecisiones", () => {
  it("ordena las evidencias de menor a mayor posterior (normal)", () => {
    const r = resumirDecisiones([], "normal");
    expect(r.porEvidencia.map((e) => e.evidencia)).toEqual([
      "protegido", "sin-antecedentes", "sintomas", "contacto", "conviviente",
    ]);
    expect(r.porEvidencia[1].posteriorPct).toBeCloseTo(33.33, 1);
    expect(r.porEvidencia[4].posteriorPct).toBeCloseTo(75, 6);
  });

  it("la acción óptima varía por modalidad", () => {
    const normal = resumirDecisiones([], "normal").porEvidencia;
    expect(normal.find((e) => e.evidencia === "protegido")?.optima).toBe("liberar");
    expect(normal.filter((e) => e.optima === "aislar")).toHaveLength(4);

    const experto = resumirDecisiones([], "experto").porEvidencia;
    expect(experto.filter((e) => e.optima === "aislar").map((e) => e.evidencia)).toEqual(["conviviente"]);
  });

  it("calcula el % que aisló por evidencia y deja null sin casos", () => {
    const r = resumirDecisiones(
      [f("conviviente", "aislar"), f("conviviente", "liberar"), f("conviviente", "aislar"), f("protegido", "liberar")],
      "normal",
    );
    const conviviente = r.porEvidencia.find((e) => e.evidencia === "conviviente");
    expect(conviviente).toMatchObject({ casos: 3 });
    expect(conviviente?.aislaronPct).toBeCloseTo(200 / 3, 6);
    expect(r.porEvidencia.find((e) => e.evidencia === "contacto")).toMatchObject({ casos: 0, aislaronPct: null });
  });

  it("cuenta decisiones óptimas y VPP observado sobre el total", () => {
    // Normal: conviviente, contacto y síntomas se aíslan (óptimo); protegido se libera (óptimo).
    const r = resumirDecisiones(
      [
        f("conviviente", "aislar", true), // óptimo
        f("contacto", "liberar", false), // no óptimo
        f("protegido", "liberar", false), // óptimo
        f("sintomas", "aislar", true), // óptimo (0,497 > 0,25)
      ],
      "normal",
    );
    expect(r.n).toBe(4);
    expect(r.decisionesOptimasPct).toBe(75);
    expect(r.vppObservadoPct).toBe(50);
  });

  it("sin decisiones no divide entre cero", () => {
    const r = resumirDecisiones([], "experto");
    expect(r).toMatchObject({ n: 0, vppObservadoPct: null, decisionesOptimasPct: null });
    expect(r.porEvidencia.every((e) => e.casos === 0 && e.aislaronPct === null)).toBe(true);
  });
});
