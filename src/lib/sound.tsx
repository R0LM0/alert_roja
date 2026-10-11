"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import useSound from "use-sound";

export type NombreSonido = "click" | "alerta" | "acierto" | "error";

const RUTAS: Record<NombreSonido, string> = {
  click: "/sounds/click.ogg",
  alerta: "/sounds/alerta.ogg",
  acierto: "/sounds/acierto.ogg",
  error: "/sounds/error.ogg",
};

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

/** Provee `useSonido()` a la app (montar una vez, cerca de la raíz). */
export function SonidoProvider({ children }: { children: ReactNode }) {
  // Mismo valor que el servidor en el primer render (evita el mismatch de
  // hidratación); la preferencia guardada se aplica tras montar.
  const [silenciado, setSilenciado] = useState(true);
  useEffect(() => {
    setSilenciado(leerSilencioGuardado());
  }, []);
  const activado = !silenciado;

  const [tocarClick] = useSound(RUTAS.click, { soundEnabled: activado, volume: 0.5 });
  const [tocarAlerta] = useSound(RUTAS.alerta, { soundEnabled: activado, volume: 0.6 });
  const [tocarAcierto] = useSound(RUTAS.acierto, { soundEnabled: activado, volume: 0.6 });
  const [tocarError] = useSound(RUTAS.error, { soundEnabled: activado, volume: 0.6 });

  const play = useCallback(
    (nombre: NombreSonido) => {
      if (silenciado) return;
      try {
        if (nombre === "click") tocarClick();
        else if (nombre === "alerta") tocarAlerta();
        else if (nombre === "acierto") tocarAcierto();
        else tocarError();
      } catch {
        // Audio opcional: nunca rompe el juego.
      }
    },
    [silenciado, tocarClick, tocarAlerta, tocarAcierto, tocarError],
  );

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
