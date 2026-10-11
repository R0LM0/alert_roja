import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = { intuicionPct: number; realidadPct: number; intuicionTexto: string; realidadTexto: string };

function Barra({ etiqueta, pct, texto, clase }: { etiqueta: string; pct: number; texto: string; clase: string }) {
  const ancho = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{etiqueta}</span>
        <span className="font-display text-2xl font-bold tabular-nums">{texto}</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${etiqueta}: ${texto}`}>
        <div className={cn("h-full rounded-full", clase)} style={{ width: `${ancho}%` }} />
      </div>
    </div>
  );
}

export function ComparacionIntuicion({ intuicionPct, realidadPct, intuicionTexto, realidadTexto }: Props) {
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Tu intuición frente a la realidad</CardTitle>
      <p className="text-lg">
        Tu intuición: <strong>{intuicionTexto}</strong> · Realidad: <strong>{realidadTexto}</strong>
      </p>
      <Barra etiqueta="Tu intuición (promedio)" pct={intuicionPct} texto={intuicionTexto} clase="bg-info" />
      <Barra etiqueta="Realidad (Bayes)" pct={realidadPct} texto={realidadTexto} clase="bg-primary" />
    </Card>
  );
}
