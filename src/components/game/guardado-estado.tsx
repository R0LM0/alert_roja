import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Chip de estado de guardado: icono + texto. */
export function GuardadoEstado({ guardado }: { guardado: boolean }) {
  return guardado ? (
    <Badge variant="success" role="status">
      <Check aria-hidden="true" /> Guardado
    </Badge>
  ) : (
    <Badge variant="warning" role="status">
      <Clock aria-hidden="true" /> Pendiente
    </Badge>
  );
}
