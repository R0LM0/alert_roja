import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  titulo: string;
  /** Valor ya formateado, p. ej. "33,3 %". */
  valor: string;
  nota?: string;
  Icono?: LucideIcon;
  className?: string;
};

/** Tarjeta de cifra grande para el panel del proyector (legible a 3 m). */
export function StatCard({ titulo, valor, nota, Icono, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-6", className)}>
      <p className="flex items-center gap-3 text-2xl font-semibold text-muted">
        {Icono ? <Icono aria-hidden="true" className="size-8" /> : null}
        {titulo}
      </p>
      <p className="font-display text-8xl leading-none font-bold tabular-nums">{valor}</p>
      {nota ? <p className="text-xl text-muted">{nota}</p> : null}
    </Card>
  );
}
