import { describe, expect, it } from "vitest";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "./stats";
import { formatearNumero, formatearPct, pasosBayes, texBayes } from "./formula-bayes";

describe("formato", () => {
  it("usa coma decimal", () => {
    expect(formatearNumero(0.09, 2)).toBe("0,09");
    expect(formatearPct(33.333)).toBe("33,3 %");
    expect(formatearPct(4.3478, 2)).toBe("4,35 %");
  });
});

describe("pasosBayes", () => {
  it("modo normal: 0,09 / 0,27 = 33,3 %", () => {
    const p = pasosBayes(PREVALENCIA);
    expect(p.numerador).toBeCloseTo(0.09, 10);
    expect(p.falsosPositivos).toBeCloseTo(0.18, 10);
    expect(p.denominador).toBeCloseTo(0.27, 10);
    expect(p.resultadoPct).toBeCloseTo(33.333, 2);
    expect(p.texto.numerador).toBe("0,9 · 0,1");
    expect(p.texto.sumaDenominador).toBe("0,9 · 0,1 + 0,2 · 0,9");
    expect(p.texto.valores).toBe("0,09 / (0,09 + 0,18)");
    expect(p.texto.denominador).toBe("0,27");
    expect(p.texto.resultado).toBe("33,3 %");
    expect(p.texto.frecuencias).toBe(
      "De 1000 personas: 90 + 180 dan positivo; solo 90 están enfermas",
    );
  });

  it("modo experto: 0,009 / 0,207 = 4,35 %", () => {
    const p = pasosBayes(PREVALENCIA_EXPERTO);
    expect(p.denominador).toBeCloseTo(0.207, 10);
    expect(p.resultadoPct).toBeCloseTo(4.3478, 3);
    expect(p.texto.numerador).toBe("0,9 · 0,01");
    expect(p.texto.sumaDenominador).toBe("0,9 · 0,01 + 0,2 · 0,99");
    expect(p.texto.denominador).toBe("0,207");
    expect(p.texto.resultado).toBe("4,35 %");
    expect(p.texto.frecuencias).toBe(
      "De 1000 personas: 9 + 198 dan positivo; solo 9 están enfermas",
    );
  });

  it("expone las frecuencias naturales como números", () => {
    expect(pasosBayes(PREVALENCIA).conteos).toEqual({ vp: 90, fp: 180, fn: 10, vn: 720 });
    expect(pasosBayes(PREVALENCIA_EXPERTO).conteos).toEqual({ vp: 9, fp: 198, fn: 1, vn: 792 });
  });
});

describe("texBayes", () => {
  it("modo normal: fracciones con coma decimal", () => {
    const t = texBayes(PREVALENCIA, 0.9, 0.8);
    expect(t.simbolica).toContain("\\dfrac");
    expect(t.simbolica).toContain("P(E\\mid +)");
    expect(t.sustitucion).toContain("0{,}9 \\cdot 0{,}1");
    expect(t.sustitucion).toContain("0{,}2 \\cdot 0{,}9");
    expect(t.resultado).toBe("\\dfrac{0{,}09}{0{,}27} = 33{,}3\\,\\%");
  });

  it("modo experto: 0,009 / 0,207 = 4,35 %", () => {
    const t = texBayes(PREVALENCIA_EXPERTO, 0.9, 0.8);
    expect(t.sustitucion).toContain("0{,}9 \\cdot 0{,}01");
    expect(t.sustitucion).toContain("0{,}2 \\cdot 0{,}99");
    expect(t.resultado).toBe("\\dfrac{0{,}009}{0{,}207} = 4{,}35\\,\\%");
  });

  it("no usa punto decimal ni comandos de red", () => {
    const t = texBayes(PREVALENCIA, 0.9, 0.8);
    for (const s of Object.values(t)) {
      expect(s).not.toMatch(/\d\.\d/);
      expect(s).not.toMatch(/\\(url|href|includegraphics|input)/);
    }
  });

  it("resalta numerador y denominador con clases del tema", () => {
    const t = texBayes(PREVALENCIA, 0.9, 0.8);
    expect(t.simbolica).toContain("\\htmlClass{tex-num}");
    expect(t.simbolica).toContain("\\htmlClass{tex-den}");
  });
});
