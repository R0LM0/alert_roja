"use client";

import { useEffect } from "react";
import { reintentarPendientes } from "@/lib/cola-offline";

/** Reenvía las partidas en cola al cargar la página y cuando vuelve la conexión. No pinta nada. */
export function ReintentoOffline() {
  useEffect(() => {
    void reintentarPendientes();
    const alVolver = () => void reintentarPendientes();
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, []);
  return null;
}
