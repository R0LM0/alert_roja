import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconoBrillo } from "./IconoBrillo";

type StatCardProps = {
  titulo: string;
  /** Valor ya formateado, p. ej. "33,3 %". */
  valor: string;
  nota?: string;
  Icono?: LucideIcon;
  /** Desfase (s) del destello del icono. */
  retardo?: number;
  className?: string;
};

/** Tarjeta de cifra grande para el panel del proyector (legible a 3 m). */
export function StatCard({ titulo, valor, nota, Icono, retardo, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-6", className)}>
      <p className="flex items-center gap-3 text-2xl font-semibold text-muted">
        {Icono ? <IconoBrillo Icono={Icono} retardo={retardo} /> : null}
        {titulo}
      </p>
      <p className="font-display text-8xl leading-none font-bold tabular-nums">{valor}</p>
      {nota ? <p className="text-xl text-muted">{nota}</p> : null}
    </Card>
  );
}
