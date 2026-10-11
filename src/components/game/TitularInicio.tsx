"use client";

import { motion, useReducedMotion } from "motion/react";
import { Siren } from "lucide-react";

/** Título animado de la portada; estático si el usuario pidió menos movimiento. */
export function TitularInicio() {
  const reducido = useReducedMotion();
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <motion.div
        aria-hidden="true"
        animate={reducido ? undefined : { scale: [1, 1.12, 1], opacity: [1, 0.75, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
      >
        <Siren className="size-9" />
      </motion.div>
      <motion.h1
        initial={reducido ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="font-display text-6xl font-bold text-primary-text"
      >
        Alerta Roja
      </motion.h1>
      <motion.p
        initial={reducido ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-muted"
      >
        Un positivo no siempre significa estar enfermo.
      </motion.p>
    </header>
  );
}
