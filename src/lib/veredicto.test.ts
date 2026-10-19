import { describe, expect, it } from "vitest";
import type { FilaPaciente } from "@/lib/resultado";
import { calcularVeredicto } from "./veredicto";

function fila(estaba_infectado: boolean, decision: FilaPaciente["decision"]): FilaPaciente {
  return {
    orden: 1,
    nombre: "Paciente",
    estimacionPct: null,
    decision,
    estaba_infectado,
    puntaje: 0,
    decisionAcertada: false,
  };
}

describe("calcularVeredicto", () => {
  it("declara un brote si se liberó un infectado y usa el singular", () => {
    expect(calcularVeredicto([fila(true, "liberar")])).toEqual({
      estado: "brote",
      infectadosLiberados: 1,
      infectadosAislados: 0,
      titulo: "La ciudad se contagió",
      detalle: "Liberaste 1 paciente infectado: cada uno contagió a otros y el brote siguió creciendo.",
    });
  });

  it("declara la ciudad a salvo si todos los infectados fueron aislados", () => {
    expect(calcularVeredicto([fila(true, "aislar"), fila(false, "liberar")])).toEqual({
      estado: "salvada",
      infectadosLiberados: 0,
      infectadosAislados: 1,
      titulo: "La ciudad está a salvo",
      detalle: "Aislaste a los 1 paciente infectado y no se escapó ninguno.",
    });
  });

  it("en una ronda mixta cuenta solo a los infectados según la decisión, no el puntaje", () => {
    expect(calcularVeredicto([
      fila(true, "liberar"), fila(false, "liberar"), fila(true, "aislar"), fila(false, "aislar"),
      fila(true, "liberar"), fila(true, "aislar"),
    ])).toEqual({
      estado: "brote",
      infectadosLiberados: 2,
      infectadosAislados: 2,
      titulo: "La ciudad se contagió",
      detalle: "Liberaste 2 pacientes infectados: cada uno contagió a otros y el brote siguió creciendo.",
    });
  });

  it("una ronda vacía está a salvo: no escapó nadie", () => {
    expect(calcularVeredicto([])).toEqual({
      estado: "salvada",
      infectadosLiberados: 0,
      infectadosAislados: 0,
      titulo: "La ciudad está a salvo",
      detalle: "Aislaste a los 0 pacientes infectados y no se escapó ninguno.",
    });
  });

  it("usa el plural al aislar a varios infectados", () => {
    expect(calcularVeredicto([fila(true, "aislar"), fila(true, "aislar")]).detalle).toBe(
      "Aislaste a los 2 pacientes infectados y no se escapó ninguno.",
    );
  });
});
