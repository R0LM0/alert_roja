export type ResultadoLimite = { ok: boolean; retryAfterSeg: number };

type Opciones = { max: number; ventanaMs: number; ahora?: () => number };

/** Limitador de ventana deslizante en memoria (por instancia; suficiente para una feria). */
export function crearLimitador({ max, ventanaMs, ahora = Date.now }: Opciones) {
  const hits = new Map<string, number[]>();

  function limpiar(t: number) {
    for (const [k, ts] of hits) {
      if (ts.length === 0 || t - ts[ts.length - 1] >= ventanaMs) hits.delete(k);
    }
  }

  return {
    revisar(clave: string): ResultadoLimite {
      const t = ahora();
      if (hits.size > 5000) limpiar(t);
      const recientes = (hits.get(clave) ?? []).filter((x) => t - x < ventanaMs);
      if (recientes.length >= max) {
        hits.set(clave, recientes);
        return { ok: false, retryAfterSeg: Math.max(1, Math.ceil((recientes[0] + ventanaMs - t) / 1000)) };
      }
      recientes.push(t);
      hits.set(clave, recientes);
      return { ok: true, retryAfterSeg: 0 };
    },
  };
}

/** IP del cliente: primer salto de x-forwarded-for. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
