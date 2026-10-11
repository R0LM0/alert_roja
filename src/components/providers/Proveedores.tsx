"use client";

import { useEffect, type ReactNode } from "react";
import { BotonSilencio } from "@/components/game/BotonSilencio";
import { SonidoProvider, useSonido } from "@/lib/sound";

/** Suena `click` al pulsar botones y enlaces (salvo los marcados con data-sin-sonido). */
function ClickSonoro() {
  const { play } = useSonido();
  useEffect(() => {
    const alPulsar = (e: MouseEvent) => {
      const destino = e.target instanceof Element ? e.target.closest("button, a[href]") : null;
      if (!destino || destino.closest("[data-sin-sonido]")) return;
      if (destino instanceof HTMLButtonElement && destino.disabled) return;
      play("click");
    };
    document.addEventListener("click", alPulsar);
    return () => document.removeEventListener("click", alPulsar);
  }, [play]);
  return null;
}

/** Proveedores globales de cliente: sonido (silenciado por defecto) y su botón fijo. */
export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <SonidoProvider>
      <ClickSonoro />
      {children}
      <BotonSilencio className="fixed top-2 right-2 z-50" />
    </SonidoProvider>
  );
}
