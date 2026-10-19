import { NextResponse } from "next/server";
import { sugerenciasPara, variantesApodo } from "@/lib/apodos";
import { apodosOcupados, reclamarApodo } from "@/lib/apodos-db";
import { errorJson, logError } from "@/lib/api";
import { clientIp, crearLimitador } from "@/lib/rate-limit";
import { reservaApodoSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1024;
const limitador = crearLimitador({ max: 20, ventanaMs: 60_000 });

/** Reserva el apodo para el dispositivo; 409 con sugerencias si ya es de otro. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limite = limitador.revisar(ip);
  if (!limite.ok) {
    console.warn(`[api] POST /api/apodos 429 ip=${ip}`);
    return errorJson(429, "Demasiadas solicitudes, probá en un momento", undefined, {
      "retry-after": String(limite.retryAfterSeg),
    });
  }

  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES) return errorJson(413, "Cuerpo demasiado grande");

  let texto: string;
  try {
    texto = await req.text();
  } catch {
    return errorJson(400, "No se pudo leer el cuerpo");
  }
  if (Buffer.byteLength(texto) > MAX_BYTES) return errorJson(413, "Cuerpo demasiado grande");

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return errorJson(400, "JSON inválido");
  }

  const parsed = reservaApodoSchema.safeParse(json);
  if (!parsed.success) {
    return errorJson(400, "Datos inválidos", { detalle: parsed.error.flatten().fieldErrors });
  }

  const { apodo, dueno } = parsed.data;
  try {
    if (await reclamarApodo(apodo, dueno)) return NextResponse.json({ ok: true });
    const ocupados = await apodosOcupados(variantesApodo(apodo));
    return errorJson(409, "Ese apodo ya está en uso", { sugerencias: sugerenciasPara(apodo, ocupados) });
  } catch (e) {
    logError("POST /api/apodos", e);
    return errorJson(500, "No se pudo reservar el apodo");
  }
}
