"use client";

import { useEffect } from "react";
import { ColeccionInsignias, Medalla } from "@/components/insignias/ColeccionInsignias";
import { Card, CardTitle } from "@/components/ui/card";
import type { InsigniaInfo, MedallaInsignia } from "@/lib/insignias";
import { useSonido } from "@/lib/sound";

/** Historial de insignias de este apodo en este dispositivo (sin tarjeta si está vacío). */
export function HistorialInsignias({ insignias }: { insignias: InsigniaInfo[] }) {
  if (!insignias.length) return null;
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Tus insignias</CardTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {insignias.map((i) => (
          <li key={i.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 p-2">
            <Medalla icono={i.icono} ganada compacto />
            <span className="min-w-0 text-sm font-semibold leading-snug">{i.titulo}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Todas las medallas de esta ronda: las ganadas brillan; las demás aparecen bloqueadas con su requisito. */
export function Insignias({ medallas }: { medallas: MedallaInsignia[] }) {
  const ganadas = medallas.filter((m) => m.ganada).length;
  const { play } = useSonido();
  // Destello al ganar: suena una vez, al montar, cuando entra la primera medalla.
  useEffect(() => {
    if (ganadas === 0) return;
    const id = setTimeout(() => play("insignia"), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Insignias</CardTitle>
      <p className="text-sm text-muted">
        {ganadas === 0 ? "Esta vez no ganaste insignias. ¡Inténtalo otra vez!" : `Ganaste ${ganadas} de ${medallas.length}.`}
      </p>
      <ColeccionInsignias medallas={medallas} />
    </Card>
  );
}
