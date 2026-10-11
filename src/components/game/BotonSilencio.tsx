"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSonido } from "@/lib/sound";

/** Botón de silencio global (>= 44px, accesible). */
export function BotonSilencio({ className }: { className?: string }) {
  const { silenciado, alternarSilencio } = useSonido();
  const Icono = silenciado ? VolumeX : Volume2;
  return (
    <button
      type="button"
      data-sin-sonido
      onClick={alternarSilencio}
      aria-pressed={!silenciado}
      aria-label={silenciado ? "Activar sonidos" : "Silenciar sonidos"}
      className={cn(
        "touch-target inline-flex size-11 items-center justify-center rounded-full",
        "border-2 border-border-strong bg-surface-2 text-foreground",
        "transition-colors hover:bg-ghost-hover",
        className,
      )}
    >
      <Icono className="size-5" aria-hidden="true" />
    </button>
  );
}
