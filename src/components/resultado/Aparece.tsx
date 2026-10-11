"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Entrada escalonada de cada sección; sin movimiento si el usuario lo prefiere. */
export function Aparece({ orden, children }: { orden: number; children: ReactNode }) {
  const reducido = useReducedMotion();
  return (
    <motion.section
      initial={reducido ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reducido ? 0 : 0.15 * orden }}
    >
      {children}
    </motion.section>
  );
}
