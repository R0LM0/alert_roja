"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Desfase (s) de la entrada: las tarjetas aparecen en cascada al cargar el panel. */
  retardo?: number;
  className?: string;
};

/** Entrada suave (fade y subida corta) de un bloque del panel. Con movimiento reducido aparece de golpe. */
export function EntradaPanel({ children, retardo = 0, className }: Props) {
  const reducido = useReducedMotion();
  return (
    <motion.div
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      initial={reducido ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: retardo, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
