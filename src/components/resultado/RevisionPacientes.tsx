import { Check, ChevronDown, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { explicacionPaciente } from "@/lib/explicacion";
import type { FilaPaciente } from "@/lib/resultado";

/** Revisión compacta, plegada por defecto: una línea de razón por paciente. */
export function RevisionPacientes({ filas }: { filas: FilaPaciente[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-xl font-semibold [&::-webkit-details-marker]:hidden">
          Revisa paciente por paciente
          <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-4 flex flex-col gap-2">
          {filas.map((f) => {
            const e = explicacionPaciente(f);
            return (
              <li key={e.orden} className="flex flex-col gap-1 rounded-lg bg-surface-2 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 font-semibold break-words">{e.orden}. {e.nombre}</span>
                  <span className={`flex shrink-0 items-center gap-1 font-semibold ${e.acerto ? "text-success" : "text-primary-text"}`}>
                    {e.acerto ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                    {e.acerto ? "Acierto" : "Error"}
                  </span>
                </div>
                <p className="text-muted break-words">{e.etiquetaEvidencia}</p>
                <p className="tabular-nums">
                  Elegiste <strong>{e.decision}</strong> · lo óptimo era{" "}
                  <strong>{e.optima}</strong> · {e.infectado ? "estaba infectado" : "estaba sano"}
                </p>
                <p className="break-words">{e.razon}</p>
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}
