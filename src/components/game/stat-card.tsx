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

/**
 * Tarjeta de cifra grande para el panel (legible a 3 m en el proyector).
 * En móvil el número y la nota comparten fila; la cifra se escala con el ancho de la tarjeta
 * (container query) y nunca se parte en dos líneas.
 */
export function StatCard({ titulo, valor, nota, Icono, retardo, className }: StatCardProps) {
  return (
    <Card data-testid="tarjeta-estadistica" className={cn("@container flex min-w-0 flex-col gap-2 p-4 2xl:p-6", className)}>
      <p data-testid="stat-titulo" className="flex items-center gap-2 text-base leading-tight font-semibold text-muted sm:text-lg 2xl:gap-3 2xl:text-2xl">
        {Icono ? <IconoBrillo Icono={Icono} retardo={retardo} tamano="size-6 2xl:size-8" /> : null}
        <span className="min-w-0">{titulo}</span>
      </p>
      <div className="flex items-center gap-3 max-sm:justify-between sm:flex-col sm:items-start sm:gap-2">
        <p
          data-testid="stat-valor"
          className="font-display text-[2.25rem] leading-none font-bold whitespace-nowrap tabular-nums sm:text-[clamp(2rem,19cqi,3.75rem)] 2xl:text-8xl"
        >
          {valor}
        </p>
        {nota ? (
          <p data-testid="stat-nota" className="min-w-0 text-sm leading-snug text-muted max-sm:text-right 2xl:text-xl">
            {nota}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
