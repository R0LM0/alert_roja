"use client";

import { motion, useReducedMotion } from "motion/react";
import { planEnsamblado, type CapaEscena } from "@/lib/consultorio-layout";
import { cn } from "@/lib/utils";

type ConsultorioProps = {
  /**
   * Detrás del juego la escena se atenúa para que la tarjeta del paciente
   * sea lo protagonista; durante "cargando" se muestra a plena luz.
   */
  atenuado?: boolean;
};

const DURACION_ENTRADA_S = 0.4;

/** Estilo de posición común: la capa ocupa su rectángulo del lienzo lógico. */
function posicion(capa: CapaEscena) {
  return {
    left: `${capa.x}%`,
    top: `${capa.y}%`,
    width: `${capa.ancho}%`,
    height: `${capa.alto}%`,
  };
}

/** Pared con zócalo y cartel del consultorio. */
function Pared() {
  return (
    <div className="flex h-full flex-col items-center justify-start bg-surface-2">
      <div className="mt-[18%] flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 shadow-soft">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Consultorio</span>
      </div>
      <div className="mt-auto h-[9%] w-full border-b-2 border-border-strong bg-surface/40" />
    </div>
  );
}

/** Piso de mosaicos, dibujado con un gradiente repetido (sin imágenes). */
function Piso() {
  return (
    <div
      className="h-full w-full"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--surface-2) 0 46%, transparent 46% 50%), repeating-linear-gradient(0deg, rgb(0 0 0 / 0.25) 0 1px, transparent 1px 22px)",
      }}
    />
  );
}

/** Puerta por la que van a entrar los pacientes (tarea T2). */
function Puerta() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-[12%] inset-y-0 rounded-t-full border-2 border-border-strong bg-surface shadow-soft" />
      <span
        aria-hidden="true"
        className="absolute top-1/2 right-[16%] size-2 rounded-full bg-border-strong"
      />
    </div>
  );
}

/** Silla simple de la sala de espera. */
function Silla({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <div className="absolute inset-x-[15%] top-[8%] h-[38%] rounded-t-md bg-surface shadow-soft" />
      <div className="absolute inset-x-[8%] top-[46%] h-[22%] rounded-md bg-surface-2 ring-1 ring-border" />
      <div className="absolute top-[68%] left-[18%] h-[32%] w-[8%] bg-surface-2" />
      <div className="absolute top-[68%] right-[18%] h-[32%] w-[8%] bg-surface-2" />
    </div>
  );
}

/** Sala de espera: tres sillas contra la pared. */
function SalaEspera() {
  return (
    <div className="flex h-full w-full items-end gap-[6%] px-[6%] pb-0">
      <div className="h-[72%] grow">
        <Silla />
      </div>
      <div className="h-[72%] grow">
        <Silla />
      </div>
      <div className="h-[72%] grow">
        <Silla />
      </div>
    </div>
  );
}

/** Cama de observación con almohada y manta. */
function Cama() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-0 top-[18%] bottom-[8%] rounded-lg bg-surface shadow-soft ring-1 ring-border" />
      <div className="absolute top-[26%] left-[6%] h-[26%] w-[24%] rounded-md bg-background/70" />
      <div className="absolute inset-x-[34%] top-[44%] bottom-[16%] rounded-md bg-primary/25" />
      <div className="absolute bottom-0 left-[4%] h-[10%] w-[10%] bg-surface-2" />
      <div className="absolute bottom-0 right-[4%] h-[10%] w-[10%] bg-surface-2" />
    </div>
  );
}

function Camas() {
  return (
    <div className="flex h-full w-full items-stretch gap-[8%] px-[2%] py-0">
      <div className="grow">
        <Cama />
      </div>
      <div className="grow">
        <Cama />
      </div>
    </div>
  );
}

/** Escritorio de triaje con carpetilla. */
function Escritorio() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-0 top-[16%] h-[34%] rounded-lg bg-surface shadow-soft ring-1 ring-border-strong" />
      <div className="absolute top-[22%] left-[14%] h-[52%] w-[10%] bg-surface-2" />
      <div className="absolute top-[22%] right-[14%] h-[52%] w-[10%] bg-surface-2" />
      <div className="absolute top-[2%] left-[38%] h-[26%] w-[22%] rotate-3 rounded-sm bg-warning/70" />
    </div>
  );
}

/** Contenido visual de cada capa, sin lógica. */
function ContenidoCapa({ id }: { id: CapaEscena["id"] }) {
  switch (id) {
    case "pared":
      return <Pared />;
    case "piso":
      return <Piso />;
    case "puerta":
      return <Puerta />;
    case "sala-espera":
      return <SalaEspera />;
    case "escritorio":
      return <Escritorio />;
    case "camas":
      return <Camas />;
  }
}

/**
 * Escena del consultorio (S3): capas de CSS puro sobre el lienzo lógico de
 * consultorio-layout. Al montarse la sala se arma con entrada escalonada (S2);
 * con movimiento reducido se muestra el estado final de una (S9). Es puramente
 * decorativa: no anuncia nada del juego (S8, S11), por eso va oculta al lector
 * de pantalla.
 */
export function Consultorio({ atenuado = false }: ConsultorioProps) {
  const reducido = useReducedMotion() ?? false;
  const plan = planEnsamblado(reducido);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      initial={false}
      animate={{ opacity: atenuado ? 0.4 : 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="relative mx-auto h-full w-full max-w-md">
        {plan.map((capa) => (
          <motion.div
            key={capa.id}
            className="absolute"
            style={posicion(capa)}
            initial={reducido ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: capa.retardoMs / 1000, duration: DURACION_ENTRADA_S, ease: "easeOut" }}
          >
            <ContenidoCapa id={capa.id} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
