import { describe, expect, it } from "vitest";

import {
  accionOptima,
  casoDePaciente,
  COSTO_AISLAR_SANO,
  COSTO_LIBERAR_ENFERMO,
  EVIDENCIAS,
  puntosPorDecision,
  posteriorBayes,
  puntajeDeRespuestas,
  UMBRAL_DECISION,
  valorEsperado,
  type Evidencia,
  type ModalidadCaso,
} from "@/lib/caso-bayesiano";

const tabla: Array<{
  evidencia: Evidencia;
  etiqueta: string;
  normal: { previo: number; posterior: number; accion: "aislar" | "liberar" };
  experto: { previo: number; posterior: number; accion: "aislar" | "liberar" };
}> = [
  {
    evidencia: "conviviente", etiqueta: "Conviviente con caso",
    normal: { previo: 0.4, posterior: 0.75, accion: "aislar" },
    experto: { previo: 0.1, posterior: 0.333333, accion: "aislar" },
  },
  {
    evidencia: "contacto", etiqueta: "Contacto estrecho",
    normal: { previo: 0.25, posterior: 0.6, accion: "aislar" },
    experto: { previo: 0.05, posterior: 0.191489, accion: "liberar" },
  },
  {
    evidencia: "sintomas", etiqueta: "Síntomas compatibles",
    normal: { previo: 0.18, posterior: 0.496933, accion: "aislar" },
    experto: { previo: 0.03, posterior: 0.122172, accion: "liberar" },
  },
  {
    evidencia: "sin-antecedentes", etiqueta: "Sin antecedentes",
    normal: { previo: 0.1, posterior: 0.333333, accion: "aislar" },
    experto: { previo: 0.01, posterior: 0.043478, accion: "liberar" },
  },
  {
    evidencia: "protegido", etiqueta: "Protegido (vacunado o con mascarilla)",
    normal: { previo: 0.04, posterior: 0.157895, accion: "liberar" },
    experto: { previo: 0.005, posterior: 0.022113, accion: "liberar" },
  },
];

const modalidades: ModalidadCaso[] = ["normal", "experto"];

describe("decisión bayesiana por paciente", () => {
  it.each(tabla)("fija los previos y la etiqueta de $evidencia", ({ evidencia, etiqueta, normal, experto }) => {
    expect(EVIDENCIAS[evidencia]).toEqual({
      etiqueta,
      previo: { normal: normal.previo, experto: experto.previo },
    });
  });

  for (const modalidad of modalidades) {
    it.each(tabla)(`calcula el posterior S4 para ${modalidad}: $evidencia`, (fila) => {
      expect(posteriorBayes(fila[modalidad].previo)).toBeCloseTo(fila[modalidad].posterior, 3);
    });

    it.each(tabla)(`elige la acción S4 para ${modalidad}: $evidencia`, (fila) => {
      expect(accionOptima(posteriorBayes(fila[modalidad].previo))).toBe(fila[modalidad].accion);
    });
  }

  it("deriva el umbral de los costos", () => {
    expect(COSTO_AISLAR_SANO).toBe(1);
    expect(COSTO_LIBERAR_ENFERMO).toBe(3);
    expect(UMBRAL_DECISION).toBe(0.25);
    expect(UMBRAL_DECISION).toBe(COSTO_AISLAR_SANO / (COSTO_AISLAR_SANO + COSTO_LIBERAR_ENFERMO));
  });

  it("libera en el empate y prefiere la acción con mayor valor esperado a ambos lados", () => {
    expect(accionOptima(UMBRAL_DECISION)).toBe("liberar");
    expect(valorEsperado("aislar", UMBRAL_DECISION)).toBe(valorEsperado("liberar", UMBRAL_DECISION));
    for (const posterior of [0.1, 0.4]) {
      const optima = accionOptima(posterior);
      const alternativa = optima === "aislar" ? "liberar" : "aislar";
      expect(valorEsperado(optima, posterior)).toBeGreaterThan(valorEsperado(alternativa, posterior));
    }
    expect(valorEsperado("aislar", 0)).toBe(-1);
    expect(valorEsperado("liberar", 1)).toBe(-3);
  });

  it("da un punto solo por la acción óptima, incluido el empate", () => {
    expect(puntosPorDecision("liberar", 0.25)).toBe(1);
    expect(puntosPorDecision("aislar", 0.25)).toBe(0);
    expect(puntosPorDecision("aislar", 0.75)).toBe(1);
    expect(puntosPorDecision("liberar", 0.75)).toBe(0);
  });

  it("puntúa cero respuestas con cero puntos", () => {
    expect(puntajeDeRespuestas([], "normal")).toBe(0);
  });

  it("suma las decisiones óptimas y no óptimas de cada evidencia", () => {
    expect(puntajeDeRespuestas([
      { evidencia: "conviviente", decision: "aislar" },
      { evidencia: "contacto", decision: "liberar" },
      { evidencia: "protegido", decision: "liberar" },
      { evidencia: "sin-antecedentes", decision: "aislar" },
    ], "normal")).toBe(3);
  });

  it("puntúa distinto las mismas respuestas según la modalidad", () => {
    const respuestas = [
      { evidencia: "contacto", decision: "liberar" },
      { evidencia: "sintomas", decision: "liberar" },
      { evidencia: "conviviente", decision: "aislar" },
    ] as const;
    expect(puntajeDeRespuestas([...respuestas], "normal")).toBe(1);
    expect(puntajeDeRespuestas([...respuestas], "experto")).toBe(3);
  });

  it.each(modalidades)("deriva el mismo caso dos veces de la misma semilla en %s", (modalidad) => {
    const primero = casoDePaciente("feria:0", modalidad);
    expect(casoDePaciente("feria:0", modalidad)).toEqual(primero);
    expect(primero.previo).toBe(EVIDENCIAS[primero.evidencia].previo[modalidad]);
    expect(primero.posterior).toBe(posteriorBayes(primero.previo));
    expect(typeof primero.infectado).toBe("boolean");
  });

  it("alcanza evidencias distintas con semillas distintas", () => {
    const evidencias = new Set(Array.from({ length: 50 }, (_, i) => casoDePaciente(`feria:${i}`, "normal").evidencia));
    expect(evidencias.size).toBeGreaterThan(1);
  });
});
