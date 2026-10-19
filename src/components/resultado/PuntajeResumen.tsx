import { Card, CardTitle } from "@/components/ui/card";
import type { FilaPaciente } from "@/lib/resultado";

type Props = {
  total: number;
  infectadosEnRonda: number;
  filas: FilaPaciente[];
};

export function PuntajeResumen({ total, infectadosEnRonda, filas }: Props) {
  const esPuntajeAlto = filas.length === 10 && total >= 8;
  const aislamientosOptimos = filas.filter((f) => f.puntos === 1 && f.decision === "aislar").length;
  const liberacionesOptimas = filas.filter((f) => f.puntos === 1 && f.decision === "liberar").length;

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Resultado de la ronda</CardTitle>
      <div className={`rounded-xl p-5 text-center sm:p-8 ${esPuntajeAlto ? "bg-success/10" : "bg-surface-2"}`}>
        <p className="font-display text-2xl font-bold sm:text-3xl">
          {esPuntajeAlto ? (total === 10 ? "¡Ronda perfecta!" : "¡Gran diagnóstico!") : "Cada decisión cuenta"}
        </p>
        <p className="mt-3 font-display text-7xl font-bold tabular-nums sm:text-8xl">
          {total}<span className="text-3xl text-muted sm:text-4xl"> / {filas.length}</span>
        </p>
        <p className="mt-2 font-semibold">decisiones de mayor valor esperado</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-left sm:gap-3">
          <div className="min-w-0 rounded-lg bg-surface p-2 sm:p-3">
            <p className="font-display text-2xl font-bold tabular-nums">{aislamientosOptimos}</p>
            <p className="text-sm break-words">aislamientos de mayor valor esperado</p>
          </div>
          <div className="min-w-0 rounded-lg bg-surface p-2 sm:p-3">
            <p className="font-display text-2xl font-bold tabular-nums">{liberacionesOptimas}</p>
            <p className="text-sm break-words">liberaciones de mayor valor esperado</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{infectadosEnRonda} de {filas.length} pacientes estaban infectados</p>
      </div>
    </Card>
  );
}
