import { Brain, ShieldCheck, Smile, type LucideIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { InsigniaInfo } from "@/lib/resultado";

const ICONOS: Record<InsigniaInfo["icono"], LucideIcon> = { brain: Brain, "shield-check": ShieldCheck, smile: Smile };

export function Insignias({ insignias }: { insignias: InsigniaInfo[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Insignias</CardTitle>
      {insignias.length === 0 ? (
        <p className="text-muted">Esta vez no ganaste insignias. ¡Inténtalo otra vez!</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insignias.map((i) => {
            const Icono = ICONOS[i.icono];
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground"
                  aria-hidden="true"
                >
                  <Icono className="size-6" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">{i.titulo}</p>
                  <p className="text-sm text-muted">{i.descripcion}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
