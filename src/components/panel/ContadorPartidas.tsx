"use client";

import { Users } from "lucide-react";
import { IconoBrillo } from "@/components/game/IconoBrillo";
import { Card } from "@/components/ui/card";
import { formatoEntero } from "@/lib/panel";
import { Destello } from "./Destello";
import { useDestello, useValorAnimado } from "./useAnimacionesPanel";

type Props = { total: number | undefined };

/** Contador en vivo de partidas: cuenta hasta el total nuevo y destella al cambiar (estático con movimiento reducido). */
export function ContadorPartidas({ total }: Props) {
  const mostrado = useValorAnimado(total);
  const clave = useDestello(total);

  return (
    <Card className="relative flex flex-col items-center gap-1 p-4 text-center sm:p-6">
      <p className="flex items-center gap-3 text-xl font-semibold text-muted sm:text-3xl">
        <IconoBrillo Icono={Users} tamano="size-7 sm:size-9" retardo={4.8} />
        Partidas jugadas
      </p>
      <p
        className="font-display text-6xl leading-none sm:text-8xl font-bold tabular-nums 2xl:text-9xl"
        data-testid="contador-partidas"
      >
        {mostrado === undefined || mostrado === null ? "—" : formatoEntero(mostrado)}
      </p>
      <Destello clave={clave} />
    </Card>
  );
}
