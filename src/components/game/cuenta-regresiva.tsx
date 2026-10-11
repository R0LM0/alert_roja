import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type CuentaRegresivaProps = {
  /** Duración total en segundos. */
  segundos: number;
  /** Segundos que quedan (los controla el padre). */
  restantes: number;
};

/** Anillo con los segundos que quedan. Solo muestra; el temporizador vive en el padre. */
export function CuentaRegresiva({ segundos, restantes }: CuentaRegresivaProps) {
  const radio = 22;
  const circunferencia = 2 * Math.PI * radio;
  const fraccion = segundos > 0 ? Math.max(0, Math.min(1, restantes / segundos)) : 0;
  const urgente = restantes <= 5;
  return (
    <div
      role="timer"
      aria-label={`Quedan ${restantes} segundos`}
      className="relative inline-flex size-14 items-center justify-center"
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={radio} fill="none" strokeWidth="5" className="stroke-surface-2" />
        <circle
          cx="26"
          cy="26"
          r={radio}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - fraccion)}
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", urgente ? "stroke-warning" : "stroke-info")}
        />
      </svg>
      <span className="flex flex-col items-center font-display text-lg leading-none font-semibold tabular-nums">
        {urgente ? <Timer aria-hidden="true" className="mb-0.5 size-3.5 text-warning" /> : null}
        {restantes}
      </span>
    </div>
  );
}
