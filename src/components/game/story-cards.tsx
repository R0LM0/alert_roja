"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const HISTORIAS = [
  {
    titulo: "Hay un brote",
    texto: "Una ciudad de 1000 personas tiene una enfermedad contagiosa. 1 de cada 10 está infectada.",
  },
  {
    titulo: "La prueba",
    texto: "La prueba detecta al 90 % de los infectados, pero también da positivo en 2 de cada 10 personas sanas.",
  },
  {
    titulo: "Tu misión",
    texto: "Te llegan 10 pacientes con resultado positivo. Estima la probabilidad de que estén infectados y decide: aislar o liberar.",
  },
] as const;

const UMBRAL_ARRASTRE = 60;

export function StoryCards({ className }: { className?: string }) {
  const [indice, setIndice] = useState(0);
  const reducido = useReducedMotion();
  const ultimo = HISTORIAS.length - 1;
  const ir = (nuevo: number) => setIndice(Math.max(0, Math.min(ultimo, nuevo)));
  const historia = HISTORIAS[indice];

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Historia del juego"
      className={cn("flex flex-col gap-4", className)}
    >
      <motion.div
        key={indice}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x < -UMBRAL_ARRASTRE) ir(indice + 1);
          else if (info.offset.x > UMBRAL_ARRASTRE) ir(indice - 1);
        }}
        initial={reducido ? false : { opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="touch-pan-y"
        aria-live="polite"
      >
        <Card className="flex min-h-44 flex-col gap-2">
          <p className="text-sm font-semibold text-muted">
            {indice + 1} de {HISTORIAS.length}
          </p>
          <CardTitle className="text-2xl">{historia.titulo}</CardTitle>
          <p className="text-lg">{historia.texto}</p>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Anterior" disabled={indice === 0} onClick={() => ir(indice - 1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="flex">
          {HISTORIAS.map((h, i) => (
            <button
              key={h.titulo}
              type="button"
              aria-label={`Ir a: ${h.titulo}`}
              aria-current={i === indice}
              onClick={() => ir(i)}
              className="touch-target flex items-center justify-center"
            >
              <span className={cn("block h-3 rounded-full transition-all", i === indice ? "w-8 bg-primary-text" : "w-3 bg-border-strong")} />
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" aria-label="Siguiente" disabled={indice === ultimo} onClick={() => ir(indice + 1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
