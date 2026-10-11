import { describe, expect, it } from "vitest";
import {
  bloquesSinSolaparse,
  calcularLayout,
  contarPorGrupo,
  normalizarFrecuencias,
  TOTAL_ESFERAS,
} from "./ciudad-layout";

const ESTANDAR = { vp: 90, fp: 180, fn: 10, vn: 720 };

describe("normalizarFrecuencias", () => {
  it("conserva el reparto estándar que ya suma 1000", () => {
    expect(normalizarFrecuencias(ESTANDAR)).toEqual({ VP: 90, FP: 180, FN: 10, VN: 720 });
  });

  it("escala con resto mayor cuando la suma difiere de 1000", () => {
    const conteo = normalizarFrecuencias({ vp: 9, fp: 18, fn: 1, vn: 72 });
    expect(conteo).toEqual({ VP: 90, FP: 180, FN: 10, VN: 720 });
    expect(Object.values(conteo).reduce((a, b) => a + b, 0)).toBe(TOTAL_ESFERAS);
  });

  it("siempre suma exactamente 1000", () => {
    const casos = [
      { vp: 1, fp: 1, fn: 1, vn: 1 },
      { vp: 0, fp: 0, fn: 0, vn: 5 },
      { vp: 333, fp: 333, fn: 334, vn: 0 },
      { vp: 0, fp: 0, fn: 0, vn: 0 },
    ];
    for (const f of casos) {
      const suma = Object.values(normalizarFrecuencias(f)).reduce((a, b) => a + b, 0);
      expect(suma).toBe(TOTAL_ESFERAS);
    }
  });
});

describe("calcularLayout", () => {
  it("reparte exactamente 1000 esferas con el conteo esperado", () => {
    const esferas = calcularLayout(ESTANDAR);
    expect(esferas).toHaveLength(TOTAL_ESFERAS);
    expect(contarPorGrupo(esferas)).toEqual({ VP: 90, FP: 180, FN: 10, VN: 720 });
  });

  it("los bloques de la tabla no se solapan", () => {
    expect(bloquesSinSolaparse(calcularLayout(ESTANDAR))).toBe(true);
    // Caso extremo: casi todo en un solo grupo.
    expect(bloquesSinSolaparse(calcularLayout({ vp: 1, fp: 1, fn: 1, vn: 997 }))).toBe(true);
  });

  it("es determinista con la misma semilla", () => {
    expect(calcularLayout(ESTANDAR, 7)).toEqual(calcularLayout(ESTANDAR, 7));
  });

  it("semillas distintas cambian el layout", () => {
    const a = calcularLayout(ESTANDAR, 7);
    const b = calcularLayout(ESTANDAR, 8);
    const iguales = a.every(
      (e, i) => e.ciudad.every((v, k) => v === b[i].ciudad[k]) && e.grupo === b[i].grupo,
    );
    expect(iguales).toBe(false);
  });
});
