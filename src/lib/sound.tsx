"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { activarAudio, fijarSilencio, iniciarAmbiente, reproducir } from "./ambiente-audio";
import type { NombreSonido } from "./ambiente";

export type { NombreSonido } from "./ambiente";

const CLAVE_STORAGE = "alerta-roja:silenciado";

type LectorStorage = Pick<Storage, "getItem">;

/**
 * Preferencia guardada de silencio. Silenciado por defecto: el navegador exige
 * un gesto del usuario antes de reproducir audio; el toggle es ese gesto.
 */
export function leerSilencioGuardado(storage?: LectorStorage): boolean {
  try {
    const guardado = (storage ?? window.localStorage).getItem(CLAVE_STORAGE);
    return guardado === null ? true : guardado === "1";
  } catch {
    return true;
  }
}

interface SonidoContexto {
  play: (nombre: NombreSonido) => void;
  silenciado: boolean;
  alternarSilencio: () => void;
}

const contexto = createContext<SonidoContexto>({
  play: () => {},
  silenciado: true,
  alternarSilencio: () => {},
});

/** Gestos que habilitan el audio (iOS Safari exige touchend). */
const GESTOS = ["pointerdown", "touchend", "keydown"] as const;

/** Provee `useSonido()` a la app (montar una vez, cerca de la raíz). */
export function SonidoProvider({ children }: { children: ReactNode }) {
  // Mismo valor que el servidor en el primer render (evita el mismatch de
  // hidratación); la preferencia guardada se aplica tras montar.
  const [silenciado, setSilenciado] = useState(true);
  useEffect(() => {
    setSilenciado(leerSilencioGuardado());
  }, []);
  // Layout: corre antes que los efectos de los hijos (p. ej. el ambiente), así que ya ve el silencio nuevo.
  useLayoutEffect(() => {
    fijarSilencio(silenciado);
  }, [silenciado]);

  // Primer gesto: crea o reanuda el contexto compartido (queda activo para todo el sitio).
  useEffect(() => {
    const alGesto = () => activarAudio();
    for (const gesto of GESTOS) window.addEventListener(gesto, alGesto, { passive: true });
    return () => {
      for (const gesto of GESTOS) window.removeEventListener(gesto, alGesto);
    };
  }, []);

  const play = useCallback((nombre: NombreSonido) => reproducir(nombre), []);

  const alternarSilencio = useCallback(() => {
    setSilenciado((previo) => {
      const siguiente = !previo;
      try {
        window.localStorage.setItem(CLAVE_STORAGE, siguiente ? "1" : "0");
      } catch {
        // Sin storage (privado/SSR): el estado en memoria igual vale.
      }
      return siguiente;
    });
  }, []);

  const valor = useMemo(() => ({ play, silenciado, alternarSilencio }), [play, silenciado, alternarSilencio]);
  return <contexto.Provider value={valor}>{children}</contexto.Provider>;
}

/** Reproduce efectos UI y controla el silencio global. */
export function useSonido(): SonidoContexto {
  return useContext(contexto);
}

/**
 * Ambiente de consultorio mientras `activo` (escena lista, ronda en curso). Al dejar de estar
 * activo, al silenciar o al desmontar, el ambiente se funde a silencio y se limpian sus timers.
 */
export function useAmbienteClinica(activo: boolean): void {
  const { silenciado } = useSonido();
  useEffect(() => {
    if (!activo || silenciado) return;
    return iniciarAmbiente();
  }, [activo, silenciado]);
}
