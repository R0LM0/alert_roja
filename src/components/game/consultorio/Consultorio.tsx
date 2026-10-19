"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  DURACION_ENTRADA_MS,
  planEnsamblado,
  type CapaId,
} from "@/lib/consultorio-layout";

/** Tinta común de la ilustración: contorno redondeado en todas las formas. */
const TINTA = {
  stroke: "var(--cons-ink)",
  strokeWidth: 1.2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

/** Sombra suave del piso, sin contorno. */
function Sombra({ cx, cy, rx, ry = 1.5 }: { cx: number; cy: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="var(--cons-shadow)" stroke="none" />;
}

/**
 * Una capa del armado: grupo SVG animado con el retardo del plan.
 * Todo el dibujo comparte el lienzo lógico 100x100 de consultorio-layout,
 * así las piezas conservan su tamaño relativo (S3).
 */
function Capa({
  id,
  retardoMs,
  reducido,
  children,
}: {
  id: CapaId;
  retardoMs: number;
  reducido: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.g
      key={id}
      initial={reducido ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: retardoMs / 1000, duration: DURACION_ENTRADA_MS / 1000, ease: "easeOut" }}
    >
      {children}
    </motion.g>
  );
}

/** Pared crema con guardabarros, cartel con cruz, reloj y lámina. */
function Pared() {
  return (
    <g style={TINTA}>
      <rect x={0} y={0} width={100} height={58} fill="var(--cons-wall)" stroke="none" />
      <rect x={0} y={46} width={100} height={12} fill="var(--cons-wall-low)" stroke="none" />
      <line x1={0} y1={46} x2={100} y2={46} />
      <line x1={0} y1={57.4} x2={100} y2={57.4} />
      {/* Cartel del consultorio */}
      <rect x={6} y={8} width={30} height={16} rx={3} fill="var(--cons-paper)" />
      <rect x={12} y={11.5} width={4.5} height={9} fill="var(--cons-cross)" stroke="none" />
      <rect x={9.5} y={13.7} width={9.5} height={4.5} fill="var(--cons-cross)" stroke="none" />
      <circle cx={30} cy={16} r={2.2} fill="var(--cons-door)" />
      {/* Reloj */}
      <circle cx={52} cy={18} r={7.5} fill="var(--cons-paper)" />
      <line x1={52} y1={18} x2={52} y2={13} />
      <line x1={52} y1={18} x2={55.5} y2={19.5} />
      {/* Lámina enmarcada */}
      <rect x={88} y={28} width={9} height={13} rx={1.5} fill="var(--cons-paper)" />
      <line x1={90} y1={32} x2={95} y2={32} />
      <line x1={90} y1={35.5} x2={95} y2={35.5} />
      <circle cx={92.5} cy={38.5} r={1.6} fill="var(--cons-chair)" />
    </g>
  );
}

/** Piso cálido de mosaicos con brillo superior. */
function Piso() {
  return (
    <g>
      <rect x={0} y={58} width={100} height={42} fill="var(--cons-floor)" stroke="none" />
      <g stroke="var(--cons-floor-line)" strokeWidth={0.7} opacity={0.6}>
        {[66, 74, 82, 90, 96].map((y) => (
          <line key={y} x1={0} y1={y} x2={100} y2={y} />
        ))}
        {[10, 30, 50, 70, 90].map((x) => (
          <line key={x} x1={x} y1={58} x2={x} y2={100} />
        ))}
      </g>
      <rect x={0} y={58} width={100} height={2.5} fill="#ffffff" opacity={0.22} stroke="none" />
    </g>
  );
}

/** Puerta turquesa por la que entrarán los pacientes (tarea T2). */
function Puerta() {
  return (
    <g style={TINTA}>
      <Sombra cx={76} cy={59} rx={9} />
      <rect x={65} y={11} width={22} height={47} rx={4} fill="var(--cons-paper)" />
      <rect x={68} y={14} width={16} height={44} rx={6} fill="var(--cons-door)" />
      <rect x={71} y={32} width={10} height={14} rx={2} fill="var(--cons-door-dark)" />
      <circle cx={76} cy={24} r={5} fill="var(--cons-paper)" />
      <circle cx={82} cy={40} r={1.8} fill="var(--cons-paper)" />
      <rect x={64} y={56} width={24} height={4} rx={1.5} fill="var(--cons-wall-low)" />
    </g>
  );
}

/** Una silla de la sala de espera, centrada en `cx` y pintada de `color`. */
function Silla({ cx, color }: { cx: number; color: string }) {
  return (
    <g style={TINTA}>
      <Sombra cx={cx} cy={58.5} rx={5} ry={1.2} />
      <line x1={cx - 3.5} y1={46.5} x2={cx - 4} y2={58} />
      <line x1={cx + 3.5} y1={46.5} x2={cx + 4} y2={58} />
      <rect x={cx - 5.5} y={42} width={11} height={4.5} rx={2} fill={color} />
      <rect x={cx - 5} y={30} width={10} height={12} rx={3} fill={color} />
    </g>
  );
}

/** Sala de espera: tres sillas de colores apoyadas en la línea del piso. */
function SalaEspera() {
  return (
    <g>
      <Silla cx={13} color="var(--cons-chair)" />
      <Silla cx={26} color="var(--cons-chair-alt)" />
      <Silla cx={39} color="var(--cons-chair)" />
    </g>
  );
}

/** Una cama de observación centrada en `cx`. */
function Cama({ cx }: { cx: number }) {
  return (
    <g style={TINTA}>
      <Sombra cx={cx} cy={86.5} rx={10} />
      <rect x={cx - 10} y={64} width={3.5} height={20} rx={1.7} fill="var(--cons-door-dark)" />
      <rect x={cx - 8} y={76} width={3} height={10} />
      <rect x={cx + 6} y={76} width={3} height={10} />
      <rect x={cx - 9} y={72} width={19} height={9} rx={2} fill="var(--cons-paper)" />
      <rect x={cx - 9} y={68.5} width={19} height={6} rx={2.5} fill="var(--cons-sheet)" />
      <rect x={cx - 2} y={68.5} width={12} height={6} rx={2.5} fill="var(--cons-bed)" />
      <rect x={cx - 8} y={69.5} width={5.5} height={4} rx={1.5} fill="var(--cons-paper)" />
    </g>
  );
}

function Camas() {
  return (
    <g>
      <Cama cx={15.5} />
      <Cama cx={39.5} />
    </g>
  );
}

/** Escritorio de triaje con papeles, taza y planta. */
function Escritorio() {
  return (
    <g style={TINTA}>
      <Sombra cx={76} cy={85.5} rx={16} />
      <rect x={61} y={74} width={3.5} height={10} fill="var(--cons-door-dark)" />
      <rect x={87.5} y={74} width={3.5} height={10} fill="var(--cons-door-dark)" />
      <rect x={59} y={69} width={34} height={6} rx={2.5} fill="var(--cons-desk)" />
      <g transform="rotate(6 70 63)">
        <rect x={64} y={60.5} width={11} height={5} rx={1} fill="var(--cons-paper)" />
      </g>
      <g transform="rotate(-8 80 63)">
        <rect x={75.5} y={60.5} width={9} height={4.5} rx={1} fill="var(--cons-chair)" />
      </g>
      <rect x={60} y={62.5} width={4.5} height={5.5} rx={1} fill="var(--cons-chair-alt)" />
      <rect x={87.5} y={61} width={5.5} height={5.5} rx={1} fill="var(--cons-chair)" />
      <circle cx={90} cy={57} r={3} fill="var(--cons-plant)" />
      <circle cx={88} cy={58.5} r={2.1} fill="var(--cons-plant)" />
    </g>
  );
}

/**
 * Escena del consultorio v2 (S3+S12): un SVG ilustrado sobre el lienzo lógico
 * de consultorio-layout, con paleta propia (`--cons-*`), contorno de tinta y
 * sombra suave. Cada capa entra con el retardo del plan: el armado dura ~2 s
 * (S2+S13); con movimiento reducido se muestra el estado final de una (S9).
 * No se atenúa durante la ronda: la tarjeta del juego trae su propio fondo
 * sólido y la escena queda legible alrededor (S14). Puramente decorativa
 * (S8, S11): oculta al lector de pantalla.
 */
export function Consultorio() {
  const reducido = useReducedMotion() ?? false;
  const plan = planEnsamblado(reducido);
  const retardo = (id: CapaId) => plan.find((c) => c.id === id)?.retardoMs ?? 0;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="flex h-full w-full items-center justify-center">
        {/* Más ancha que la columna del juego: en escritorio el consultorio
            asoma a los costados de la tarjeta y sigue legible (S14). */}
        <svg viewBox="0 0 100 100" className="h-full w-full max-w-[44rem]" role="presentation">
          <Capa id="pared" retardoMs={retardo("pared")} reducido={reducido}>
            <Pared />
          </Capa>
          <Capa id="piso" retardoMs={retardo("piso")} reducido={reducido}>
            <Piso />
          </Capa>
          <Capa id="escritorio" retardoMs={retardo("escritorio")} reducido={reducido}>
            <Escritorio />
          </Capa>
          <Capa id="camas" retardoMs={retardo("camas")} reducido={reducido}>
            <Camas />
          </Capa>
          <Capa id="sala-espera" retardoMs={retardo("sala-espera")} reducido={reducido}>
            <SalaEspera />
          </Capa>
          <Capa id="puerta" retardoMs={retardo("puerta")} reducido={reducido}>
            <Puerta />
          </Capa>
        </svg>
      </div>
    </div>
  );
}
