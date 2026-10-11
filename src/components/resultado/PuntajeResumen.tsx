import { Check, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { FilaPaciente } from "@/lib/resultado";

type Props = {
  total: number;
  infectadosEnRonda: number;
  filas: FilaPaciente[];
  estimacionTexto: (pct: number) => string;
};

function Fila({ f, estimacionTexto }: { f: FilaPaciente; estimacionTexto: (pct: number) => string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{f.orden}. {f.nombre}</span>
        <span className="font-display text-lg font-bold tabular-nums">+{f.puntaje} pts</span>
      </div>
      <p className="flex items-center gap-1.5 text-sm">
        {f.estaba_infectado ? (
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        )}
        {f.estaba_infectado ? "Estaba infectado" : "Estaba sano"}
      </p>
      <p className="text-sm text-muted">
        Estimaste {estimacionTexto(f.estimacionPct)} · {f.decision === "aislar" ? "Aislar" : "Liberar"}
      </p>
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
        {f.decisionAcertada ? (
          <Check className="size-4 text-success" aria-hidden="true" />
        ) : (
          <X className="size-4 text-primary-text" aria-hidden="true" />
        )}
        {f.decisionAcertada ? "Decisión acertada (+20)" : "Decisión errada (+0)"}
        <span className="font-normal text-muted">· estimación +{f.puntajeEstimacion}</span>
      </p>
    </li>
  );
}

export function PuntajeResumen({ total, infectadosEnRonda, filas, estimacionTexto }: Props) {
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Tu puntaje</CardTitle>
      <div className="text-center">
        <p className="font-display text-6xl font-bold tabular-nums">{total}</p>
        <p className="text-muted">
          puntos · {infectadosEnRonda} de {filas.length} pacientes estaban infectados
        </p>
      </div>
      <h3 className="font-semibold">Paciente por paciente</h3>
      <ul className="flex flex-col gap-2">
        {filas.map((f) => (
          <Fila key={f.orden} f={f} estimacionTexto={estimacionTexto} />
        ))}
      </ul>
    </Card>
  );
}
