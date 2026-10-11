import type { ReactNode } from "react";

/**
 * Fondo del panel. Hoy es un degradado estático en CSS.
 * // phase 6 integration: CiudadFondoPanel (pulso = totalPartidas)
 */
export function FondoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_15%_-10%,rgb(220_38_38/0.16),transparent),radial-gradient(50rem_36rem_at_100%_100%,rgb(96_165_250/0.10),transparent)]"
      />
      {children}
    </div>
  );
}
