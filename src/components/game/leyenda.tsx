import { CircleAlert, CircleCheck, CircleX, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type GrupoClave = "VP" | "FP" | "FN" | "VN";

const GRUPOS: Record<GrupoClave, { etiqueta: string; detalle: string; Icono: LucideIcon; color: string }> = {
  VP: { etiqueta: "Infectado y positivo", detalle: "La prueba acertó", Icono: CircleAlert, color: "bg-primary" },
  FP: { etiqueta: "Sano y positivo", detalle: "Falsa alarma", Icono: TriangleAlert, color: "bg-warning" },
  FN: { etiqueta: "Infectado y negativo", detalle: "La prueba falló", Icono: CircleX, color: "bg-info" },
  VN: { etiqueta: "Sano y negativo", detalle: "La prueba acertó", Icono: CircleCheck, color: "bg-success" },
};

type LeyendaProps = {
  grupo: GrupoClave;
  /** Cantidad opcional (p. ej. 90 personas). */
  cantidad?: number;
  className?: string;
};

/** Elemento de leyenda: muestra de color + icono + texto (el significado no depende del color). */
export function Leyenda({ grupo, cantidad, className }: LeyendaProps) {
  const { etiqueta, detalle, Icono, color } = GRUPOS[grupo];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-background", color)} aria-hidden="true">
        <Icono className="size-5 text-black" />
      </span>
      <div className="leading-tight">
        <p className="font-semibold">
          <abbr title={etiqueta} className="no-underline">{grupo}</abbr> · {etiqueta}
          {cantidad !== undefined ? <span className="text-muted"> ({cantidad})</span> : null}
        </p>
        <p className="text-sm text-muted">{detalle}</p>
      </div>
    </div>
  );
}
