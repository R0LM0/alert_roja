import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  Icono: LucideIcon;
  /** Desfase del destello en segundos, para que las tarjetas no brillen a la vez. */
  retardo?: number;
  /** Tamaño del icono (clases Tailwind `size-*`). */
  tamano?: string;
  className?: string;
};

/** Icono en una pastilla con degradado y un destello diagonal periódico (solo CSS, ver globals.css). */
export function IconoBrillo({ Icono, retardo = 0, tamano = "size-8", className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn("icono-brillo", className)}
      style={{ "--brillo-retardo": `${retardo}s` } as CSSProperties}
    >
      <Icono className={tamano} />
    </span>
  );
}
