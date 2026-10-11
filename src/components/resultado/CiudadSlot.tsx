import { Card, CardTitle } from "@/components/ui/card";
import type { Frecuencias } from "@/lib/stats";
import { TablaFrecuencias } from "./TablaFrecuencias";

type Props = { frecuencias: Frecuencias; mensajeFrecuencias: string };

/** INTEGRATION POINT: aquí entra la animación de la ciudad (1000 puntos -> tabla 2x2). */
export function CiudadSlot({ frecuencias, mensajeFrecuencias }: Props) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold">La ciudad completa</h2>
      <p className="text-muted">{mensajeFrecuencias}</p>
      {/* phase 6 integration: swap for CiudadRevelacion (3D/2D wrapper) */}
      <TablaFrecuencias frecuencias={frecuencias} />
    </Card>
  );
}
