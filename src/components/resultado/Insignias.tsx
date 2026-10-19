"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Brain, FlaskConical, Leaf, Lock, ShieldCheck, Smile, Zap, type LucideIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { IconoInsignia, InsigniaInfo, MedallaInsignia } from "@/lib/insignias";
import { useSonido } from "@/lib/sound";

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

type MedallaProps = { icono: IconoInsignia; ganada: boolean; compacto?: boolean; indice?: number };

/** Medalla redonda con anillo degradado. Al ganarla entra con escala y brillo, escalonada por `indice`. */
function Medalla({ icono, ganada, compacto = false, indice = 0 }: MedallaProps) {
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
  if (!ganada || compacto) return cuerpo;
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

/** Historial de insignias de este apodo en este dispositivo (sin tarjeta si está vacío). */
export function HistorialInsignias({ insignias }: { insignias: InsigniaInfo[] }) {
  if (!insignias.length) return null;
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Tus insignias</CardTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {insignias.map((i) => (
          <li key={i.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 p-2">
            <Medalla icono={i.icono} ganada compacto />
            <span className="min-w-0 text-sm font-semibold leading-snug">{i.titulo}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Todas las medallas: las ganadas en esta ronda brillan; las demás aparecen bloqueadas con su requisito. */
export function Insignias({ medallas }: { medallas: MedallaInsignia[] }) {
  const ganadas = medallas.filter((m) => m.ganada).length;
  let indiceGanada = 0;
  const { play } = useSonido();
  // Destello al ganar: suena una vez, al montar, cuando entra la primera medalla.
  useEffect(() => {
    if (ganadas === 0) return;
    const id = setTimeout(() => play("insignia"), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Insignias</CardTitle>
      <p className="text-sm text-muted">
        {ganadas === 0 ? "Esta vez no ganaste insignias. ¡Inténtalo otra vez!" : `Ganaste ${ganadas} de ${medallas.length}.`}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {medallas.map(({ info, requisito, ganada }) => {
          const indice = ganada ? indiceGanada++ : 0;
          return (
            <li
              key={info.id}
              className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-3 text-center ${ganada ? "border-warning/60 bg-surface-2" : "border-border bg-surface"}`}
            >
              <Medalla icono={info.icono} ganada={ganada} indice={indice} />
              <p className={`font-display text-base font-semibold leading-snug ${ganada ? "" : "text-muted"}`}>{info.titulo}</p>
              <p className={`text-xs leading-snug ${ganada ? "text-success" : "text-muted"}`}>{ganada ? "Ganada" : "Bloqueada"}</p>
              <p className="text-xs leading-snug text-muted">{ganada ? info.descripcion : `Cómo ganarla: ${requisito}`}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
