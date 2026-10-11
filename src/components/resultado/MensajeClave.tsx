import { Lightbulb } from "lucide-react";

export function MensajeClave({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-primary bg-surface p-5 shadow-glow">
      <Lightbulb className="mt-1 size-6 shrink-0 text-warning" aria-hidden="true" />
      <p className="font-display text-xl font-semibold">{mensaje}</p>
    </div>
  );
}
