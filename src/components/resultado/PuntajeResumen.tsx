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
        <span className="font-display text-lg font-bold tabular-nums">+{f.puntaje} acierto{f.puntaje === 1 ? "" : "s"}</span>
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
        {f.estimacionPct !== null ? `Estimaste ${estimacionTexto(f.estimacionPct)} · ` : ""}
        {f.decision === "aislar" ? "Aislar" : "Liberar"}
      </p>
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
        {f.decisionAcertada ? (
          <Check className="size-4 text-success" aria-hidden="true" />
        ) : (
          <X className="size-4 text-primary-text" aria-hidden="true" />
        )}
        {f.decisionAcertada ? "Decisión acertada (+1)" : "Decisión errada (+0)"}
      </p>
    </li>
  );
}

export function PuntajeResumen({ total, infectadosEnRonda, filas, estimacionTexto }: Props) {
  const esPuntajeAlto = filas.length === 10 && total >= 8;
  const aislamientosAcertados = filas.filter((f) => f.decisionAcertada && f.decision === "aislar").length;
  const liberacionesAcertadas = filas.filter((f) => f.decisionAcertada && f.decision === "liberar").length;

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
        <p className="mt-2 font-semibold">decisiones acertadas</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg bg-surface p-3">
            <p className="font-display text-2xl font-bold tabular-nums">{aislamientosAcertados}</p>
            <p className="text-sm">aislamientos acertados</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="font-display text-2xl font-bold tabular-nums">{liberacionesAcertadas}</p>
            <p className="text-sm">liberaciones acertadas</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{infectadosEnRonda} de {filas.length} pacientes estaban infectados</p>
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
