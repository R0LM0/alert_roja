"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Leyenda, type GrupoClave } from "@/components/game/leyenda";
import { distribuirPuntos } from "@/lib/resultado";
import type { Frecuencias } from "@/lib/stats";
import { cn } from "@/lib/utils";

const COLOR_PUNTO: Record<GrupoClave, string> = {
  VP: "bg-primary",
  FP: "bg-warning",
  FN: "bg-info",
  VN: "bg-success",
};

const RETARDO_AGRUPAR_MS = 900;

/** 1000 puntos decorativos: mezclados al inicio y reagrupados en la tabla 2x2. */
function Puntos({ frecuencias }: { frecuencias: Frecuencias }) {
  const reducido = useReducedMotion();
  const [agrupado, setAgrupado] = useState(false);
  const { puntos, columnas, filas } = distribuirPuntos(frecuencias);

  useEffect(() => {
    if (reducido) return;
    const t = setTimeout(() => setAgrupado(true), RETARDO_AGRUPAR_MS);
    return () => clearTimeout(t);
  }, [reducido]);

  const final = reducido || agrupado;
  const lado = 100 / columnas;
  return (
    <div className="relative w-full" style={{ aspectRatio: `${columnas} / ${filas}` }} aria-hidden="true">
      {puntos.map((p, i) => {
        const pos = final ? p.agrupado : p.mezclado;
        return (
          <span
            key={i}
            className={cn("absolute left-0 top-0 block [clip-path:circle(36%)]", COLOR_PUNTO[p.grupo])}
            style={{
              width: `${lado}%`,
              aspectRatio: "1",
              transform: `translate(${pos.x * 100}%, ${pos.y * 100}%)`,
              transition: reducido ? "none" : "transform 1.1s cubic-bezier(.22,1,.36,1)",
            }}
          />
        );
      })}
    </div>
  );
}

const FILAS_TABLA: { titulo: string; grupos: [GrupoClave, GrupoClave] }[] = [
  { titulo: "Positivo", grupos: ["VP", "FP"] },
  { titulo: "Negativo", grupos: ["FN", "VN"] },
];

type TablaProps = {
  frecuencias: Frecuencias;
  /** Solo la tabla con los conteos: sin puntos ni leyenda (los aporta la escena de la ciudad). */
  soloTabla?: boolean;
};

/** Alternativa accesible: puntos que se reagrupan + tabla 2x2 con los conteos y la leyenda. */
export function TablaFrecuencias({ frecuencias, soloTabla = false }: TablaProps) {
  const cantidad: Record<GrupoClave, number> = {
    VP: frecuencias.vp,
    FP: frecuencias.fp,
    FN: frecuencias.fn,
    VN: frecuencias.vn,
  };
  return (
    <div className="flex flex-col gap-4">
      {soloTabla ? null : <Puntos frecuencias={frecuencias} />}
      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <caption className="sr-only">
          Tabla 2x2 de una ciudad de 1000 personas según estar infectado y el resultado de la prueba
        </caption>
        <thead>
          <tr>
            <td />
            <th scope="col" className="p-1 text-sm font-semibold text-muted">Infectados</th>
            <th scope="col" className="p-1 text-sm font-semibold text-muted">Sanos</th>
          </tr>
        </thead>
        <tbody>
          {FILAS_TABLA.map((fila) => (
            <tr key={fila.titulo}>
              <th scope="row" className="p-1 text-sm font-semibold text-muted">{fila.titulo}</th>
              {fila.grupos.map((g) => (
                <td key={g} className="rounded-lg bg-surface-2 p-2">
                  <span className="block font-display text-2xl font-bold tabular-nums">{cantidad[g]}</span>
                  <span className="block text-sm font-semibold">{g}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {soloTabla ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["VP", "FP", "FN", "VN"] as const).map((g) => (
            <Leyenda key={g} grupo={g} cantidad={cantidad[g]} />
          ))}
        </div>
      )}
    </div>
  );
}
