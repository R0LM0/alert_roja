"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { esGamaBaja, hayWebGL, prefiereReducido } from "@/components/three/CiudadRevelacion";

// El 3D vive solo en el cliente y fuera del bundle inicial del panel.
const CiudadFondoPanel = dynamic(
  () => import("@/components/three/CiudadFondoPanel").then((m) => m.CiudadFondoPanel),
  { ssr: false },
);

type Props = { children: ReactNode; pulso: number };

/**
 * Fondo del panel: degradado CSS siempre; encima, la ciudad 3D tenue (pulso = partidas)
 * salvo sin WebGL, equipo de gama baja o movimiento reducido (queda solo el degradado).
 */
export function FondoPanel({ children, pulso }: Props) {
  const [con3d, setCon3d] = useState(false);
  useEffect(() => {
    setCon3d(!prefiereReducido() && hayWebGL() && !esGamaBaja());
  }, []);

  return (
    <div className="relative isolate min-h-dvh bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_15%_-10%,rgb(220_38_38/0.16),transparent),radial-gradient(50rem_36rem_at_100%_100%,rgb(96_165_250/0.10),transparent)]"
      />
      {con3d ? (
        // Opacidad baja: el texto sobre la escena conserva contraste AA (ver evidencia en odd/tasks).
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-35">
          <CiudadFondoPanel pulso={pulso} />
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
