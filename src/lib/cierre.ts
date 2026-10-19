import { z } from "zod";

/**
 * CIERRE_FERIA (opcional): desde esa hora, las partidas creadas después no cuentan en el ranking ni en el podio.
 * Debe traer zona horaria (ej. 2026-10-20T18:00:00-06:00) para no depender del servidor.
 */
const cierreSchema = z.string().trim().datetime({ offset: true });

/** Devuelve el instante en ISO UTC, o null si no hay valor o no es válido. Sin efectos. */
export function interpretarCierre(valor: string | undefined): string | null {
  if (valor === undefined || valor.trim() === "") return null;
  const r = cierreSchema.safeParse(valor);
  return r.success ? new Date(r.data).toISOString() : null;
}

const avisados = new Set<string>();

/** Lee CIERRE_FERIA del entorno. Si es inválida, se ignora y se avisa una sola vez en la consola. */
export function cierreFeria(): string | null {
  const valor = process.env.CIERRE_FERIA;
  const iso = interpretarCierre(valor);
  if (iso === null && valor?.trim() && !avisados.has(valor)) {
    avisados.add(valor);
    console.warn(`[config] CIERRE_FERIA "${valor}" no es una fecha ISO con zona (ej. 2026-10-20T18:00:00-06:00). Se ignora.`);
  }
  return iso;
}
