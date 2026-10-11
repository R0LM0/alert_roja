"use client";

import { useEffect, useRef } from "react";
import { motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { DoorOpen, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AccionesDecision } from "@/components/game/AccionesDecision";
import { PatientAvatar } from "@/components/game/patient-avatar";
import { PositivoStamp } from "@/components/game/positivo-stamp";
import { Termometro } from "@/components/game/termometro";
import type { Decision, PacienteRonda } from "@/lib/ronda";

/** Distancia (px) y velocidad (px/s) mínimas para que un deslizamiento cuente como decisión. */
const UMBRAL_PX = 90;
const UMBRAL_VELOCIDAD = 600;

type TarjetaPacienteProps = {
  paciente: PacienteRonda;
  estimacion: number;
  onEstimacion: (pct: number) => void;
  onDecidir: (decision: Decision) => void;
  disabled?: boolean;
};

/**
 * Tarjeta del paciente. Deslizar la parte superior (avatar y nombre): derecha = aislar,
 * izquierda = liberar. El arrastre solo arranca desde ahí para no chocar con el slider.
 * No muestra si el paciente está infectado: la verdad se revela al final.
 */
export function TarjetaPaciente({ paciente, estimacion, onEstimacion, onDecidir, disabled }: TarjetaPacienteProps) {
  const reducido = useReducedMotion();
  const controles = useDragControls();
  const x = useMotionValue(0);
  const inclinacion = useTransform(x, [-200, 0, 200], [-6, 0, 6]);
  const pistaAislar = useTransform(x, [0, UMBRAL_PX], [0, 1]);
  const pistaLiberar = useTransform(x, [-UMBRAL_PX, 0], [1, 0]);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Cada paciente remonta la tarjeta: el foco pasa al nombre para teclado y lectores.
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      style={{ x, rotate: reducido ? 0 : inclinacion }}
      drag={disabled ? false : "x"}
      dragListener={false}
      dragControls={controles}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        const { x: dx } = info.offset;
        const rapido = Math.abs(info.velocity.x) > UMBRAL_VELOCIDAD && Math.abs(dx) > 30;
        if (dx > UMBRAL_PX || (rapido && dx > 0)) onDecidir("aislar");
        else if (dx < -UMBRAL_PX || (rapido && dx < 0)) onDecidir("liberar");
      }}
      initial={reducido ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="relative flex flex-col gap-5">
        <div
          onPointerDown={(e) => controles.start(e)}
          style={{ touchAction: "pan-y" }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <PatientAvatar seed={paciente.seed} name={paciente.nombre} className="size-20 sm:size-28" />
          <h2
            ref={titulo}
            tabIndex={-1}
            className="font-display text-2xl font-semibold outline-offset-4"
          >
            {paciente.nombre}
          </h2>
          <PositivoStamp />
        </div>

        <motion.span
          aria-hidden="true"
          style={{ opacity: pistaAislar }}
          className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-warning px-2 py-1 text-sm font-bold text-warning-foreground"
        >
          <Lock className="size-4" /> Aislar
        </motion.span>
        <motion.span
          aria-hidden="true"
          style={{ opacity: pistaLiberar }}
          className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-sm font-bold text-success-foreground"
        >
          <DoorOpen className="size-4" /> Liberar
        </motion.span>

        <Termometro value={estimacion} onChange={onEstimacion} disabled={disabled} />
        <AccionesDecision onDecidir={onDecidir} disabled={disabled} />
        <p className="hidden text-center text-sm text-muted pointer-coarse:block">
          También puedes deslizar la tarjeta: a la derecha aísla, a la izquierda libera.
        </p>
      </Card>
    </motion.div>
  );
}
