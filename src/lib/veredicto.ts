import type { FilaPaciente } from "@/lib/resultado";

export type EstadoVeredicto = "brote" | "salvada";

export function calcularVeredicto(filas: FilaPaciente[]): {
  estado: EstadoVeredicto;
  infectadosLiberados: number;
  infectadosAislados: number;
  titulo: string;
  detalle: string;
} {
  const infectadosLiberados = filas.filter((fila) => fila.estaba_infectado && fila.decision === "liberar").length;
  const infectadosAislados = filas.filter((fila) => fila.estaba_infectado && fila.decision === "aislar").length;

  if (infectadosLiberados > 0) {
    return {
      estado: "brote",
      infectadosLiberados,
      infectadosAislados,
      titulo: "La ciudad se contagió",
      detalle: `Liberaste ${infectadosLiberados} ${infectadosLiberados === 1 ? "paciente infectado" : "pacientes infectados"}: cada uno contagió a otros y el brote siguió creciendo.`,
    };
  }

  return {
    estado: "salvada",
    infectadosLiberados,
    infectadosAislados,
    titulo: "La ciudad está a salvo",
    detalle: infectadosAislados === 0
      ? "No hubo ningún infectado en tu ronda: nadie contagió a la ciudad."
      : `Aislaste a los ${infectadosAislados} ${infectadosAislados === 1 ? "paciente infectado" : "pacientes infectados"} y no se escapó ninguno.`,
  };
}
