"use client";

import { motion, useReducedMotion } from "motion/react";

type Props = {
  /** Cambia cada vez que hay que destellar (ver `useDestello`); 0 = sin destello. */
  clave: number;
};

/** Anillo que se apaga tras cada cambio de valor. Con movimiento reducido no aparece. */
export function Destello({ clave }: Props) {
  const reducido = useReducedMotion();
  if (clave === 0 || reducido) return null;
  return (
    <motion.span
      key={clave}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-xl ring-4 ring-primary-text"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    />
  );
}
