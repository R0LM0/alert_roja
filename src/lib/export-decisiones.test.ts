import { describe, expect, it } from "vitest";
import { EVIDENCIAS, posteriorBayes } from "./caso-bayesiano";
import {
  EVIDENCIAS_ORDEN,
  PUNTOS_DESVIO,
  decisionOptima,
  formatearPct,
  frecuenciasDeModo,
  interpretarDecisiones,
  modoDePrevalencia,
  resumirEvidencias,
  textoUmbral,
  totalDecisiones,
  type FilaEvidencia,
  type RespuestaDecision,
} from "./export-decisiones";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "./stats";

const r = (evidencia: RespuestaDecision["evidencia"], decision: RespuestaDecision["decision"], estabaInfectado = false): RespuestaDecision => ({
  evidencia,
  decision,
  estabaInfectado,
});

describe("decisión óptima por evidencia", () => {
  it("sigue la tabla de S4: normal aísla salvo protegido; experto solo aísla al conviviente", () => {
    expect(EVIDENCIAS_ORDEN).toEqual(["conviviente", "contacto", "sintomas", "sin-antecedentes", "protegido"]);
    expect(EVIDENCIAS_ORDEN.map((e) => decisionOptima(e, "normal"))).toEqual(["aislar", "aislar", "aislar", "aislar", "liberar"]);
    expect(EVIDENCIAS_ORDEN.map((e) => decisionOptima(e, "experto"))).toEqual(["aislar", "liberar", "liberar", "liberar", "liberar"]);
  });

  it("posteriores de Bayes de la tabla S4", () => {
    expect(posteriorBayes(EVIDENCIAS.conviviente.previo.normal)).toBeCloseTo(0.75, 6);
    expect(posteriorBayes(EVIDENCIAS.protegido.previo.normal)).toBeCloseTo(0.158, 3);
    expect(posteriorBayes(EVIDENCIAS.conviviente.previo.experto)).toBeCloseTo(0.333, 3);
  });

  it("modoDePrevalencia distingue las dos modalidades", () => {
    expect(modoDePrevalencia(PREVALENCIA)).toBe("normal");
    expect(modoDePrevalencia(PREVALENCIA_EXPERTO)).toBe("experto");
  });
});

describe("resumirEvidencias", () => {
  it("calcula casos, % que aisló, % óptimas e % infectados por evidencia", () => {
    const rs = [
      r("protegido", "aislar", false),
      r("protegido", "aislar", true),
      r("protegido", "liberar", false),
      r("conviviente", "aislar", true),
      r(null, "liberar", true), // sin evidencia: no cuenta
    ];
    const filas = resumirEvidencias(rs, "normal");
    const prot = filas.find((f) => f.evidencia === "protegido")!;
    expect(prot.casos).toBe(3);
    expect(prot.pctAislo).toBeCloseTo(2 / 3, 6);
    expect(prot.optima).toBe("liberar");
    expect(prot.pctOptimas).toBeCloseTo(1 / 3, 6);
    expect(prot.pctInfectados).toBeCloseTo(1 / 3, 6);
    const conv = filas.find((f) => f.evidencia === "conviviente")!;
    expect([conv.casos, conv.pctAislo, conv.pctOptimas, conv.pctInfectados]).toEqual([1, 1, 1, 1]);
    const contacto = filas.find((f) => f.evidencia === "contacto")!;
    expect([contacto.casos, contacto.pctAislo, contacto.pctOptimas, contacto.pctInfectados]).toEqual([0, null, null, null]);
  });

  it("total ignora las respuestas sin evidencia", () => {
    const total = totalDecisiones([r("conviviente", "aislar"), r("protegido", "aislar"), r(null, "liberar")], "normal");
    expect(total.casos).toBe(2);
    expect(total.pctAislo).toBe(1);
    expect(total.pctOptimas).toBeCloseTo(0.5, 6); // conviviente óptimo aislar; protegido óptimo liberar
    expect(totalDecisiones([], "normal")).toEqual({ casos: 0, pctAislo: null, pctOptimas: null });
  });
});

describe("interpretarDecisiones", () => {
  const base = (over: Partial<FilaEvidencia>[]): FilaEvidencia[] =>
    EVIDENCIAS_ORDEN.map((evidencia, i) => ({
      evidencia,
      etiqueta: EVIDENCIAS[evidencia].etiqueta,
      previo: 0.1,
      posterior: 0.2,
      optima: decisionOptima(evidencia, "normal"),
      casos: 0,
      pctAislo: null,
      pctOptimas: null,
      pctInfectados: null,
      ...(over[i] ?? {}),
    }));

  it("señala el mayor desvío: aisló de más a los protegidos", () => {
    const filas = base([{}, {}, {}, {}, { casos: 5, pctAislo: 0.62, pctOptimas: 0.38 }]);
    const lineas = interpretarDecisiones(filas, { casos: 5, pctOptimas: 0.38 });
    expect(lineas[0]).toBe(
      "El público aisló de más a los pacientes protegidos (vacunados o con mascarilla): 62 % vs óptimo 0 %.",
    );
    expect(lineas[1]).toBe("En total, 38 % de las 5 decisiones coincidió con la óptima.");
  });

  it("habla de liberar de más cuando lo óptimo es aislar", () => {
    const filas = base([{ casos: 4, pctAislo: 0.25, pctOptimas: 0.25 }]);
    const lineas = interpretarDecisiones(filas, { casos: 4, pctOptimas: 0.25 });
    expect(lineas[0]).toBe(
      "El público liberó de más a los pacientes con conviviente que tuvo el caso: aisló 25 % vs óptimo 100 %.",
    );
  });

  it("sin desvío relevante lo dice", () => {
    const filas = base([{ casos: 3, pctAislo: 1, pctOptimas: 1 }]);
    expect(interpretarDecisiones(filas, { casos: 3, pctOptimas: 1 })[0]).toBe(
      "El público se acercó a la decisión óptima en todas las evidencias.",
    );
    expect(PUNTOS_DESVIO).toBe(15);
  });

  it("sin decisiones devuelve una sola línea explicativa", () => {
    expect(interpretarDecisiones(base([]), { casos: 0, pctOptimas: null })).toEqual([
      "Sin decisiones registradas en esta modalidad todavía.",
    ]);
  });
});

describe("frecuencias naturales y textos", () => {
  it("tabla 2x2 de 1000 personas para cada modalidad", () => {
    expect(frecuenciasDeModo("normal")).toMatchObject({ vp: 90, fp: 180, fn: 10, vn: 720 });
    expect(frecuenciasDeModo("experto")).toMatchObject({ vp: 9, fp: 198, fn: 1, vn: 792 });
  });

  it("formatea porcentajes en español", () => {
    expect(formatearPct(1 / 3)).toBe("33,3 %");
    expect(formatearPct(0.62, 0)).toBe("62 %");
  });

  it("el texto del umbral sale de las constantes del juego", () => {
    expect(textoUmbral()).toContain("supera 25 %");
    expect(textoUmbral()).toContain("cuesta 1");
    expect(textoUmbral()).toContain("cuesta 3");
  });
});
