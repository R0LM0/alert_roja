import { Brain, ShieldCheck, Smile, type LucideIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { InsigniaInfo } from "@/lib/insignias";

const ICONOS: Record<InsigniaInfo["icono"], LucideIcon> = { brain: Brain, "shield-check": ShieldCheck, smile: Smile };

function IconoInsignia({ icono, compacto = false }: { icono: InsigniaInfo["icono"]; compacto?: boolean }) {
  const Icono = ICONOS[icono];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground ${compacto ? "size-9" : "size-11"}`}
      aria-hidden="true"
    >
      <Icono className={compacto ? "size-5" : "size-6"} />
    </span>
  );
}

/** Historial de insignias de este apodo en este dispositivo (sin tarjeta si está vacío). */
export function HistorialInsignias({ insignias }: { insignias: InsigniaInfo[] }) {
  if (!insignias.length) return null;
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Tus insignias</CardTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {insignias.map((i) => (
          <li key={i.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 p-2">
            <IconoInsignia icono={i.icono} compacto />
            <span className="min-w-0 text-sm font-semibold leading-snug">{i.titulo}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Insignias({ insignias }: { insignias: InsigniaInfo[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Insignias</CardTitle>
      {insignias.length === 0 ? (
        <p className="text-muted">Esta vez no ganaste insignias. ¡Inténtalo otra vez!</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insignias.map((i) => {
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
                <IconoInsignia icono={i.icono} />
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
