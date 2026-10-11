import Link from "next/link";
import { RotateCcw, Skull, Undo2 } from "lucide-react";
import { GuardadoEstado } from "@/components/game/guardado-estado";
import { Button } from "@/components/ui/button";
import type { Modo } from "@/lib/ronda";

type Props = { modo: Modo; guardado: boolean; onJugarDeNuevo: () => void; onCambiarModo: () => void };

export function AccionesResultado({ modo, guardado, onJugarDeNuevo, onCambiarModo }: Props) {
  const esExperto = modo === "experto";
  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite" className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted">Estado de tu partida:</span>
        <GuardadoEstado guardado={guardado} />
      </div>
      <Button size="lg" onClick={onJugarDeNuevo}>
        <RotateCcw aria-hidden="true" /> Jugar de nuevo
      </Button>
      <Button size="lg" variant="outline" onClick={onCambiarModo}>
        {esExperto ? <Undo2 aria-hidden="true" /> : <Skull aria-hidden="true" />}
        {esExperto ? "Volver al modo normal" : "Modo experto"}
      </Button>
      <Button asChild variant="ghost">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </div>
  );
}
