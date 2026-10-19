"use client";

import { motion, useReducedMotion } from "motion/react";
import type { FilaPaciente } from "@/lib/resultado";
import { calcularVeredicto } from "@/lib/veredicto";

const FOCOS = [
  { cx: 239, cy: 112, r: 7 },
  { cx: 202, cy: 95, r: 5 },
  { cx: 281, cy: 83, r: 6 },
  { cx: 151, cy: 80, r: 4 },
  { cx: 350, cy: 102, r: 5 },
];

const EDIFICIOS_AFECTADOS = [
  { x: 143, y: 70, width: 51, height: 64 },
  { x: 223, y: 51, width: 49, height: 83 },
  { x: 315, y: 63, width: 45, height: 71 },
];

export function VeredictoCiudad({ filas }: { filas: FilaPaciente[] }) {
  const { estado, titulo, detalle } = calcularVeredicto(filas);
  const reducido = useReducedMotion();
  const esBrote = estado === "brote";

  return (
    <div
      role="status"
      data-testid="veredicto-ciudad"
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]"
    >
      <svg viewBox="0 0 480 160" className="block h-auto w-full" aria-hidden="true">
        <rect width="480" height="160" fill="var(--veredicto-cielo)" />
        <path d="M0 107h25V81h30V94h31V65h36v42h38V78h31v29h32V73h38v34h40V76h30v31h31V67h31v40h43V86h30v21h24v53H0Z" fill="var(--veredicto-lejano)" />
        <path d="M44 55h62v79H44zM143 70h51v64h-51zM223 51h49v83h-49zM315 63h45v71h-45zM392 75h49v59h-49z" fill="var(--veredicto-edificio)" />
        <path d="M54 67h13v5H54zm24 0h13v5H78zM54 82h13v5H54zm24 0h13v5H78zM151 81h10v5h-10zm20 0h10v5h-10zm60-19h11v5h-11zm19 0h11v5h-11zm73 13h10v5h-10zm19 0h10v5h-10zm58 12h11v5h-11zm19 0h11v5h-11z" fill="var(--veredicto-ventana)" />
        {esBrote && EDIFICIOS_AFECTADOS.map((edificio, i) => (
          <motion.rect
            key={edificio.x}
            {...edificio}
            fill="var(--primary)"
            initial={reducido ? false : { opacity: 0 }}
            animate={{ opacity: 0.65 }}
            transition={{ duration: reducido ? 0 : 0.8, delay: reducido ? 0 : 0.5 + i * 0.38 }}
          />
        ))}
        <path d="M0 134h480v26H0z" fill="var(--veredicto-suelo)" />
        <path d="M0 139h480" stroke="var(--veredicto-ventana)" strokeWidth="2" opacity="0.55" />
        {!esBrote && (
          <motion.circle
            cx="239" cy="119" fill="none" stroke="var(--success)" strokeWidth="2"
            initial={reducido ? false : { r: 12, opacity: 0.4 }}
            animate={{ r: reducido ? 29 : [12, 22, 29], opacity: reducido ? 0.2 : [0.4, 0.28, 0.2] }}
            transition={{ duration: reducido ? 0 : 2, ease: "easeOut" }}
          />
        )}
        <circle cx="239" cy="113" r="5" fill={esBrote ? "var(--primary)" : "var(--success)"} />
        <path d="M236 120h6l3 14h-12z" fill={esBrote ? "var(--primary)" : "var(--success)"} />
        {esBrote && FOCOS.map((foco, i) => (
          <motion.circle
            key={foco.cx}
            cx={foco.cx} cy={foco.cy} fill="var(--primary-text)"
            initial={reducido ? false : { r: 0, opacity: 0 }}
            animate={{ r: foco.r, opacity: 0.85 }}
            transition={{ duration: reducido ? 0 : 0.55, delay: reducido ? 0 : 0.25 + i * 0.32 }}
          />
        ))}
      </svg>
      <div className="px-5 py-5 sm:px-7">
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${esBrote ? "text-primary-text" : "text-success"}`}>
          Destino de la ciudad
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{titulo}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{detalle}</p>
      </div>
    </div>
  );
}
