"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ShieldAlert } from "lucide-react";
import { useSonido } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Sello "POSITIVO": icono + texto (nunca solo color). Estático con movimiento reducido. */
export function PositivoStamp({ className }: { className?: string }) {
  const reducido = useReducedMotion();
  const { play } = useSonido();
  // Suena al aparecer el sello (nuevo paciente); `play` no suena si está silenciado.
  // Solo al montar: si cambia `play` (des/silenciar) no debe repetirse.
  useEffect(() => {
    play("alerta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      role="img"
      aria-label="Resultado de la prueba: positivo"
      initial={reducido ? false : { scale: 2.2, opacity: 0, rotate: -18 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border-4 border-primary-text px-4 py-1.5 font-display text-2xl font-bold tracking-widest text-primary-text uppercase",
        className,
      )}
    >
      <ShieldAlert aria-hidden="true" className="size-7" />
      <span aria-hidden="true">Positivo</span>
    </motion.div>
  );
}
