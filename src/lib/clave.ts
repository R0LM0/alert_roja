import { createHash, timingSafeEqual } from "node:crypto";

/** Comparación en tiempo constante (se comparan hashes de igual longitud). Sin clave configurada, nada coincide. */
export function claveValida(recibida: string | null | undefined, esperada: string | undefined): boolean {
  if (!esperada) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recibida ?? ""), h(esperada));
}
