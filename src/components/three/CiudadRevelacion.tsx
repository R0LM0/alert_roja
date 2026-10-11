"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Ciudad2D } from "./Ciudad2D";
import type { FaseCiudad, Frecuencias } from "@/lib/ciudad-layout";

// El 3D vive solo en el cliente (WebGL, sin SSR).
const CiudadAnimadaDinamica = dynamic(
  () => import("./CiudadAnimada").then((m) => m.CiudadAnimada),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="rounded-lg border-2 border-border bg-surface p-6 text-center text-muted">
        Cargando visualización…
      </p>
    ),
  },
);

interface CiudadRevelacionProps {
  frecuencias: Frecuencias;
  fase: FaseCiudad;
}

function hayWebGL(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function esGamaBaja(): boolean {
  try {
    const hilos = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 8) : 8;
    const ram =
      typeof navigator !== "undefined"
        ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8)
        : 8;
    return hilos <= 4 || ram <= 4;
  } catch {
    return false;
  }
}

function prefiereReducido(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

/**
 * Decide 3D vs 2D: usa 2D si no hay WebGL, si el dispositivo es de
 * gama baja o si se prefiere movimiento reducido.
 */
export function CiudadRevelacion({ frecuencias, fase }: CiudadRevelacionProps) {
  // 2D por defecto (coincide con el SSR); el cliente asciende a 3D si puede.
  const [modo, setModo] = useState<"3d" | "2d">("2d");
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const reducidoActivo = prefiereReducido();
    setReducido(reducidoActivo);
    if (!reducidoActivo && hayWebGL() && !esGamaBaja()) setModo("3d");
  }, []);

  if (modo === "3d") {
    return <CiudadAnimadaDinamica frecuencias={frecuencias} fase={fase} reducido={reducido} />;
  }
  return <Ciudad2D frecuencias={frecuencias} fase={fase} reducido={reducido} />;
}
