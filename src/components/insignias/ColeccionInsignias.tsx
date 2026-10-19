"use client";

import { motion, useReducedMotion } from "motion/react";
import { Brain, FlaskConical, Leaf, Lock, ShieldCheck, Smile, Zap, type LucideIcon } from "lucide-react";
import { formatearFechaInsignia, type IconoInsignia, type MedallaInsignia } from "@/lib/insignias";

const ICONOS: Record<IconoInsignia, LucideIcon> = {
  brain: Brain,
  "shield-check": ShieldCheck,
  smile: Smile,
  zap: Zap,
  leaf: Leaf,
  "flask-conical": FlaskConical,
};

// Degradados de la medalla: dorado de advertencia; decorativos, el texto da el significado.
const ANILLO_GANADA = "conic-gradient(from 200deg, #fde68a, #f59e0b, #b45309, #fde68a, #f59e0b)";
const NUCLEO_GANADA = "radial-gradient(circle at 32% 26%, #fde68a, #f59e0b 58%, #b45309)";
const BRILLO = "rgba(245, 158, 11, 0.6)";

type MedallaProps = { icono: IconoInsignia; ganada: boolean; compacto?: boolean; indice?: number; animar?: boolean };

/** Medalla redonda con anillo degradado. Al ganarla entra con escala y brillo, escalonada por `indice`. */
export function Medalla({ icono, ganada, compacto = false, indice = 0, animar = true }: MedallaProps) {
  const Icono = ICONOS[icono];
  const reducido = useReducedMotion();
  const tamano = compacto ? "size-12" : "size-20";
  const iconoTamano = compacto ? "size-5" : "size-9";
  const cuerpo = (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full p-[3px] ${tamano} ${ganada ? "" : "opacity-60 grayscale"}`}
      style={{ background: ganada ? ANILLO_GANADA : "var(--border)" }}
      aria-hidden="true"
    >
      <span
        className="flex size-full items-center justify-center rounded-full text-warning-foreground"
        style={{ background: ganada ? NUCLEO_GANADA : "var(--surface-2)", color: ganada ? undefined : "var(--muted)" }}
      >
        <Icono className={iconoTamano} />
      </span>
      {ganada ? null : (
        <Lock className="absolute -right-1 -bottom-1 size-5 rounded-full bg-surface p-0.5 text-muted" />
      )}
    </span>
  );
  if (!ganada || compacto || !animar) return cuerpo;
  return (
    <motion.span
      className="flex rounded-full"
      initial={reducido ? false : { scale: 0.4, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        boxShadow: [`0 0 0 0 ${BRILLO}`, `0 0 30px 10px ${BRILLO}`, `0 0 16px 4px rgba(245, 158, 11, 0.35)`],
      }}
      transition={{ duration: reducido ? 0 : 0.9, delay: reducido ? 0 : 0.25 + indice * 0.18, ease: "easeOut" }}
    >
      {cuerpo}
    </motion.span>
  );
}

/** Cuadrícula de medallas: las ganadas muestran su descripción y, si se conoce, la fecha; las demás, su requisito. */
export function ColeccionInsignias({ medallas, animar = true }: { medallas: MedallaInsignia[]; animar?: boolean }) {
  let indiceGanada = 0;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {medallas.map(({ info, requisito, ganada, fecha }) => {
        const indice = ganada ? indiceGanada++ : 0;
        const estado = ganada ? (fecha ? `Ganada el ${formatearFechaInsignia(fecha)}` : "Ganada") : "Bloqueada";
        return (
          <li
            key={info.id}
            className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-3 text-center ${ganada ? "border-warning/60 bg-surface-2" : "border-border bg-surface"}`}
          >
            <Medalla icono={info.icono} ganada={ganada} indice={indice} animar={animar} />
            <p className={`font-display text-base font-semibold leading-snug ${ganada ? "" : "text-muted"}`}>{info.titulo}</p>
            <p className={`text-xs leading-snug ${ganada ? "text-success" : "text-muted"}`}>{estado}</p>
            <p className="text-xs leading-snug text-muted">{ganada ? info.descripcion : `Cómo ganarla: ${requisito}`}</p>
          </li>
        );
      })}
    </ul>
  );
}
