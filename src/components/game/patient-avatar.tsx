"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { edadPaciente, generoPaciente, type Edad, type Genero } from "@/lib/paciente3d";

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
const LENTES_MAYORES = ["glasses", "glasses2", "glasses3", "glasses4", "glasses5"] as const;
const BARBAS = ["chin", "full", "full2", "goatee1", "goatee2", "moustache1", "moustache2", "moustache3"] as const;

/** Peinado de openPeeps por género y edad: pelo largo o recogido para ellas, corto para ellos. */
const PEINADOS = {
  mujer: {
    nino: ["bangs", "bangs2", "longBangs", "mediumBangs2"],
    joven: ["long", "longBangs", "longCurly", "bun", "bun2"],
    adulto: ["long", "longCurly", "bun", "bun2", "buns", "longBangs"],
    mayor: ["grayBun", "grayMedium"],
  },
  hombre: {
    nino: ["short1", "short2", "short3", "bangs"],
    joven: ["short1", "short2", "short3", "short4", "short5", "flatTop", "afro"],
    adulto: ["short1", "short2", "short3", "short4", "short5", "flatTop", "shaved1", "shaved2", "afro"],
    mayor: ["grayShort", "grayMedium", "shaved1"],
  },
} as const satisfies Record<Genero, Record<Edad, readonly string[]>>;

/**
 * Avatar neutro del HUD. Peinado, barba y lentes siguen al género y la edad del paciente
 * (nombre y semilla, nunca infección, S11). `size` fija width/height en el SVG: sin
 * dimensiones intrínsecas, la imagen puede decodificarse vacía en algunos navegadores.
 */
export function getPatientAvatarUri(seed: string, nombre: string): string {
  const genero = generoPaciente(nombre);
  const edad = edadPaciente(seed);
  const barba = genero === "hombre" && (edad === "adulto" || edad === "mayor");
  const mayor = edad === "mayor";
  return createAvatar(openPeeps, {
    seed,
    face: [...CARAS],
    backgroundColor: FONDOS,
    head: [...PEINADOS[genero][edad]],
    facialHair: [...BARBAS],
    facialHairProbability: barba ? 55 : 0,
    accessories: mayor ? [...LENTES_MAYORES] : [...ACCESORIOS],
    accessoriesProbability: mayor ? 100 : edad === "nino" ? 0 : 20,
    maskProbability: 0,
    radius: 50,
    size: 128,
  }).toDataUri();
}

/**
 * Avatar generado localmente (DiceBear "Open Peeps", diseño CC0 de Pablo Stanley);
 * determinista por semilla. Respira con un balanceo suave, salvo con movimiento reducido.
 */
export function PatientAvatar({ seed, name, className }: PatientAvatarProps) {
  const reducido = useReducedMotion();
  const uri = useMemo(() => getPatientAvatarUri(seed, name), [seed, name]);

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
