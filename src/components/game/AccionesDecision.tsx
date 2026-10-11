import { DoorOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Decision } from "@/lib/ronda";

type AccionesDecisionProps = {
  onDecidir: (decision: Decision) => void;
  disabled?: boolean;
};

/** Botones de decisión: siempre disponibles (el deslizar es un atajo, no la única vía). */
export function AccionesDecision({ onDecidir, disabled }: AccionesDecisionProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="warning" size="lg" className="min-h-14" disabled={disabled} onClick={() => onDecidir("aislar")}>
        <Lock aria-hidden="true" /> Aislar
      </Button>
      <Button variant="success" size="lg" className="min-h-14" disabled={disabled} onClick={() => onDecidir("liberar")}>
        <DoorOpen aria-hidden="true" /> Liberar
      </Button>
    </div>
  );
}
