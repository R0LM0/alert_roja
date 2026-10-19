import { Card, CardTitle } from "@/components/ui/card";
import type { ExplicacionFrecuencias } from "@/lib/explicacion";

type Props = {
  explicacion: ExplicacionFrecuencias;
  infectadosEnRonda: number;
  total: number;
};

/** Frecuencias naturales: la misma cuenta que la tabla 2x2, contada persona por persona. */
export function PorQuePasoEsto({ explicacion, infectadosEnRonda, total }: Props) {
  const ultimo = explicacion.pasos.length - 1;
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>¿Por qué pasó esto?</CardTitle>
      <p className="text-muted">Imagina {explicacion.poblacion} personas, una por una:</p>
      <ol className="flex flex-col gap-3">
        {explicacion.pasos.map((texto, i) => (
          <li key={texto} className="flex gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-bold"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <p className={`min-w-0 [overflow-wrap:anywhere] ${i === ultimo ? "font-semibold" : ""}`}>{texto}</p>
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-surface-2 p-3 font-semibold">
        En tu ronda, {infectadosEnRonda} de {total} pacientes estaban infectados.
      </p>
    </Card>
  );
}
