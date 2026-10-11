"use client";

import { Card } from "@/components/ui/card";
import { CiudadRevelacion } from "@/components/three/CiudadRevelacion";
import type { FaseCiudad } from "@/lib/ciudad-layout";
import type { Frecuencias } from "@/lib/stats";
import { TablaFrecuencias } from "./TablaFrecuencias";

type Props = { frecuencias: Frecuencias; mensajeFrecuencias: string; fase: FaseCiudad };

/**
 * La ciudad: escena 3D (o 2D de respaldo) que se reagrupa en la tabla 2x2, más la tabla
 * de texto con los conteos, siempre visible para leer la estadística sin la animación.
 * La leyenda (icono + texto) la aporta la propia escena.
 */
export function CiudadSlot({ frecuencias, mensajeFrecuencias, fase }: Props) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold">La ciudad completa</h2>
      <p className="text-muted">{mensajeFrecuencias}</p>
      <CiudadRevelacion frecuencias={frecuencias} fase={fase} />
      <TablaFrecuencias frecuencias={frecuencias} soloTabla />
    </Card>
  );
}
