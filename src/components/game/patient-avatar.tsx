"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type PatientAvatarProps = {
  seed: string;
  name: string;
  className?: string;
};

/** Fondos suaves para que cada paciente tenga su propio color. */
const FONDOS = ["ffd6cc", "ffe8b3", "d4f1d9", "d3e4ff", "e9d8ff", "ffd9ec"];

/**
 * Solo expresiones neutras y sin mascarilla ni accesorios médicos: la cara no debe dar
 * ninguna pista sobre si el paciente está infectado (sería una señal falsa que sesga la
 * estimación; el sorteo de infección es independiente del avatar).
 */
const CARAS = ["calm", "blank", "serious"] as const;
const ACCESORIOS = ["glasses", "glasses2", "glasses3", "glasses4", "glasses5", "sunglasses"] as const;

/**
 * Avatar generado localmente (DiceBear "Open Peeps", diseño CC0 de Pablo Stanley);
 * determinista por semilla. Respira con un balanceo suave, salvo con movimiento reducido.
 */
export function PatientAvatar({ seed, name, className }: PatientAvatarProps) {
  const reducido = useReducedMotion();
  const uri = useMemo(
    () =>
      createAvatar(openPeeps, {
        seed,
        face: [...CARAS],
        backgroundColor: FONDOS,
        accessories: [...ACCESORIOS],
        maskProbability: 0,
        accessoriesProbability: 25,
        radius: 50,
      }).toDataUri(),
    [seed],
  );

  return (
    <motion.div
      className={cn("size-28 shrink-0", className)}
      animate={reducido ? undefined : { y: [0, -5, 0], rotate: [-1.5, 1.5, -1.5] }}
      transition={reducido ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI local, no hay nada que optimizar */}
      <img
        src={uri}
        alt={`Avatar de ${name}`}
        width={112}
        height={112}
        className="size-full rounded-full bg-surface-2 shadow-soft"
      />
    </motion.div>
  );
}
