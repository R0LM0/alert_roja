import { partidaSchema, type PartidaInput } from "./schema";

/** Subconjunto de Storage que usamos (se inyecta en las pruebas). */
export type AlmacenTexto = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const CLAVE = "alerta-roja:cola";
/** Tope para que una cola olvidada no crezca sin límite. */
const MAX_COLA = 20;

/** localStorage del navegador o null (SSR, modo privado, acceso denegado). */
export function localSeguro(): AlmacenTexto | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export type Cola = {
  encolar: (p: PartidaInput) => void;
  pendientes: () => PartidaInput[];
  /** `enviar` devuelve true si la partida ya no debe reintentarse (guardada o rechazada). */
  reintentar: (enviar: (p: PartidaInput) => Promise<boolean>) => Promise<void>;
};

export function crearCola(almacen: AlmacenTexto | null = localSeguro()): Cola {
  const leer = (): PartidaInput[] => {
    try {
      const crudo = almacen?.getItem(CLAVE);
      if (!crudo) return [];
      const lista: unknown = JSON.parse(crudo);
      if (!Array.isArray(lista)) return [];
      return lista.flatMap((x) => {
        const r = partidaSchema.safeParse(x);
        return r.success ? [r.data] : [];
      });
    } catch {
      return [];
    }
  };
  const escribir = (lista: PartidaInput[]) => {
    try {
      if (lista.length === 0) almacen?.removeItem(CLAVE);
      else almacen?.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      // Modo privado o cuota llena: se pierde la cola, pero el juego sigue.
    }
  };

  return {
    pendientes: leer,
    encolar: (p) => escribir([...leer(), p].slice(-MAX_COLA)),
    async reintentar(enviar) {
      for (const p of leer()) {
        let listo = false;
        try {
          listo = await enviar(p);
        } catch {
          listo = false;
        }
        if (!listo) return; // conserva orden: no se salta una partida pendiente
        // Releer: otra pestaña pudo haber cambiado la cola mientras esperábamos.
        const resto = leer();
        const i = resto.findIndex((x) => JSON.stringify(x) === JSON.stringify(p));
        if (i >= 0) escribir(resto.filter((_, j) => j !== i));
      }
    },
  };
}

export type ResultadoEnvio =
  | { estado: "guardado"; id: string; puntaje: number }
  | { estado: "pendiente" }
  | { estado: "rechazado"; mensaje: string };

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** Un intento de POST, sin tocar la cola. 5xx, 429 y fallos de red son reintentables; el resto de 4xx no. */
export async function enviarSinCola(
  payload: PartidaInput,
  fetchFn: FetchFn = (u, i) => fetch(u, i),
): Promise<ResultadoEnvio> {
  let res: Response;
  try {
    res = await fetchFn("/api/partidas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { estado: "pendiente" };
  }
  const cuerpo: unknown = await res.json().catch(() => null);
  const dato = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  if (res.ok && typeof dato.id === "string" && typeof dato.puntaje === "number") {
    return { estado: "guardado", id: dato.id, puntaje: dato.puntaje };
  }
  if (res.status >= 500 || res.status === 429 || res.ok) return { estado: "pendiente" };
  return { estado: "rechazado", mensaje: typeof dato.error === "string" ? dato.error : "No se pudo guardar la partida" };
}

/** Envía la partida; si falla por red/servidor la deja en la cola para reintentar. */
export async function enviarPartida(
  payload: PartidaInput,
  opciones: { fetchFn?: FetchFn; cola?: Cola } = {},
): Promise<ResultadoEnvio> {
  const r = await enviarSinCola(payload, opciones.fetchFn);
  if (r.estado === "pendiente") (opciones.cola ?? crearCola()).encolar(payload);
  return r;
}

let reintentando = false;

/** Reintenta la cola global una sola vez a la vez (carga de página y evento `online`). */
export async function reintentarPendientes(): Promise<void> {
  if (reintentando) return;
  reintentando = true;
  try {
    await crearCola().reintentar(async (p) => (await enviarSinCola(p)).estado !== "pendiente");
  } finally {
    reintentando = false;
  }
}
