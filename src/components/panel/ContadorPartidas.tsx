"use client";

import { motion, useReducedMotion } from "motion/react";
import { Users } from "lucide-react";
import { IconoBrillo } from "@/components/game/IconoBrillo";
import { Card } from "@/components/ui/card";
import { formatoEntero } from "@/lib/panel";

type Props = { total: number | undefined };

/** Contador en vivo de partidas; late al cambiar (estático con movimiento reducido). */
export function ContadorPartidas({ total }: Props) {
  const reducido = useReducedMotion();
  const texto = total === undefined ? "—" : formatoEntero(total);

  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center sm:p-6">
      <p className="flex items-center gap-3 text-xl font-semibold text-muted sm:text-3xl">
        <IconoBrillo Icono={Users} tamano="size-7 sm:size-9" retardo={4.8} />
        Partidas jugadas
      </p>
      <motion.p
        key={texto}
        initial={reducido ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="font-display text-6xl leading-none sm:text-8xl font-bold tabular-nums 2xl:text-9xl"
        data-testid="contador-partidas"
      >
        {texto}
      </motion.p>
    </Card>
  );
}
