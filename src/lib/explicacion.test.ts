import { describe, expect, it } from "vitest";
import type { FilaPaciente } from "./resultado";
import { UMBRAL_TEXTO, explicacionFrecuencias, explicacionPaciente } from "./explicacion";

function fila(p: Pick<FilaPaciente, "evidencia" | "previo" | "posterior" | "decision" | "estaba_infectado">): FilaPaciente {
  const puntos = (p.decision === "aislar") === (p.posterior > 0.25) ? 1 : 0;
  return { orden: 1, nombre: "Ana", estimacionPct: null, puntos, decisionAcertada: false, ...p };
}

describe("explicacionFrecuencias", () => {
  it("normal: 1000 personas, 100 enfermas, 90 positivos verdaderos y 180 falsos = 1 de cada 3", () => {
    const e = explicacionFrecuencias("normal");
    expect(e).toMatchObject({ poblacion: 1000, enfermos: 100, enfermosPositivos: 90, sanos: 900, sanosPositivos: 180, positivos: 270, porCada: 3 });
    expect(e.pasos[0]).toBe("De 1000 personas, 100 están enfermas.");
    expect(e.pasos[4]).toBe("Solo 90 de esos 270 positivos están enfermos: 1 de cada 3.");
  });
  it("experto: prevalencia 1 %, 10 enfermas, 9 verdaderos positivos y 1 de cada 23", () => {
    const e = explicacionFrecuencias("experto");
    expect(e).toMatchObject({ enfermos: 10, enfermosPositivos: 9, sanos: 990, sanosPositivos: 198, positivos: 207, porCada: 23 });
    expect(e.pasos[4]).toBe("Solo 9 de esos 207 positivos están enfermos: 1 de cada 23.");
  });
  it("usa los porcentajes del test para el texto", () => {
    const e = explicacionFrecuencias("normal");
    expect(e.sensibilidadTexto).toBe("90 %");
    expect(e.falsoPositivoTexto).toBe("20 %");
    expect(UMBRAL_TEXTO).toBe("25 %");
  });
});

describe("explicacionPaciente", () => {
  it("acierto con síntomas: sube a 49,7 % y convenía aislar", () => {
    const e = explicacionPaciente(fila({ evidencia: "sintomas", previo: 0.18, posterior: 0.4969, decision: "aislar", estaba_infectado: true }));
    expect(e.acerto).toBe(true);
    expect(e.optima).toBe("aislar");
    expect(e.infectado).toBe(true);
    expect(e.etiquetaEvidencia).toBe("Síntomas compatibles");
    expect(e.razon).toBe("Con síntomas compatibles, la probabilidad sube a 49,7 %, convenía aislar.");
  });
  it("error: liberó a un paciente con conviviente y convenía aislar", () => {
    const e = explicacionPaciente(fila({ evidencia: "conviviente", previo: 0.1, posterior: 0.3333, decision: "liberar", estaba_infectado: true }));
    expect(e.acerto).toBe(false);
    expect(e.razon).toBe("Con un conviviente con caso, la probabilidad sube a 33,3 %, convenía aislar, no liberar.");
  });
  it("posterior bajo el umbral: convenía liberar", () => {
    const e = explicacionPaciente(fila({ evidencia: "protegido", previo: 0.04, posterior: 0.1579, decision: "aislar", estaba_infectado: false }));
    expect(e.optima).toBe("liberar");
    expect(e.acerto).toBe(false);
    expect(e.razon).toBe("Con protección (vacunado o barbijo), la probabilidad sube a 15,8 %, convenía liberar, no aislar.");
  });
});
