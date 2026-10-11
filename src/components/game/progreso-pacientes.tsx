import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ProgresoPacientesProps = {
  className?: string;
  /** Número del paciente actual (1 a total). */
  actual: number;
  total: number;
};

export function ProgresoPacientes({ actual, total, className }: ProgresoPacientesProps) {
  const porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;
  const texto = `Paciente ${actual} de ${total}`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="font-display text-lg font-semibold">
        Paciente {actual}/{total}
      </p>
      <Progress value={porcentaje} aria-label={texto} />
    </div>
  );
}
