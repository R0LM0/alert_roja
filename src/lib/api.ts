import { NextResponse } from "next/server";
import { filtroPrevalenciaSchema } from "./schema";

export function errorJson(status: number, error: string, extra?: Record<string, unknown>, headers?: HeadersInit) {
  return NextResponse.json({ error, ...extra }, { status, headers });
}

/** Registra en el servidor solo metadatos accionables (nunca el stack al cliente). */
export function logError(ruta: string, e: unknown) {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  console.error(`[api] ${ruta} falló: ${msg}`);
}

/** Lee ?prevalencia= . Devuelve null (todas), 0.1 / 0.01, o "invalida". */
export function leerPrevalencia(url: URL): number | null | "invalida" {
  const r = filtroPrevalenciaSchema.safeParse(url.searchParams.get("prevalencia"));
  return r.success ? r.data : "invalida";
}
