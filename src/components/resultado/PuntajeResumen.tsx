import { Check, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { EVIDENCIAS, UMBRAL_DECISION, valorEsperado } from "@/lib/caso-bayesiano";
import { formatearPct } from "@/lib/formula-bayes";
import type { FilaPaciente } from "@/lib/resultado";

type Props = {
  total: number;
  infectadosEnRonda: number;
  filas: FilaPaciente[];
};

const porcentaje = (probabilidad: number) => formatearPct(probabilidad * 100, 1);

function Fila({ f }: { f: FilaPaciente }) {
  const esOptima = f.puntos === 1;
  const perdida = -valorEsperado(f.decision, f.posterior);
  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-surface-2 p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="min-w-0 font-semibold break-words">{f.orden}. {f.nombre}</span>
        <span className="font-display font-bold tabular-nums">+{f.puntos} punto{f.puntos === 1 ? "" : "s"}</span>
      </div>
      <p className="break-words">Evidencia: {EVIDENCIAS[f.evidencia].etiqueta}</p>
      <p className="tabular-nums">Previo {porcentaje(f.previo)} → posterior {porcentaje(f.posterior)}</p>
      <p className="text-muted">Umbral {porcentaje(UMBRAL_DECISION)}: por encima conviene aislar; si no, liberar.</p>
      <p className="tabular-nums">
        Elegiste {f.decision} · pérdida esperada: {perdida.toFixed(2)} unidades
      </p>
      <p className="flex items-start gap-1.5 font-semibold">
        {esOptima ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : <X className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />}
        {esOptima ? "Decisión de mayor valor esperado (+1)" : "Otra decisión tenía mayor valor esperado (+0)"}
      </p>
    </li>
  );
}

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
      <h3 className="font-semibold">Paciente por paciente</h3>
      <ul className="flex flex-col gap-2">
        {filas.map((f) => <Fila key={f.orden} f={f} />)}
      </ul>
    </Card>
  );
}
