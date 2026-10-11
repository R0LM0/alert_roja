import { NextResponse } from "next/server";
import { errorJson, logError } from "@/lib/api";
import { sql } from "@/lib/db";
import { clientIp, crearLimitador } from "@/lib/rate-limit";
import { partidaSchema } from "@/lib/schema";
import { puntajePartida } from "@/lib/stats";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024;
const limitador = crearLimitador({ max: 10, ventanaMs: 60_000 });

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limite = limitador.revisar(ip);
  if (!limite.ok) {
    console.warn(`[api] POST /api/partidas 429 ip=${ip}`);
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

  const parsed = partidaSchema.safeParse(json);
  if (!parsed.success) {
    return errorJson(400, "Datos inválidos", { detalle: parsed.error.flatten().fieldErrors });
  }

  const { jugador, prevalencia, respuestas } = parsed.data;
  const ordenadas = [...respuestas].sort((a, b) => a.orden - b.orden);
  // El puntaje del cliente se ignora: se recalcula aquí.
  const puntaje = puntajePartida(ordenadas, prevalencia);

  try {
    // Una sola sentencia (CTE) = atómica en pg y en Neon HTTP; todo parametrizado.
    const filas = await sql()`
      with p as (
        insert into partidas (jugador, prevalencia, puntaje)
        values (${jugador}, ${prevalencia}, ${puntaje})
        returning id
      )
      insert into respuestas (partida_id, orden, estimacion_pct, decision, estaba_infectado, tiempo_ms)
      select p.id, t.orden, t.est, t.dec, t.inf, t.ms
      from p,
        unnest(
          ${ordenadas.map((r) => r.orden)}::smallint[],
          ${ordenadas.map((r) => r.estimacion_pct)}::smallint[],
          ${ordenadas.map((r) => r.decision)}::text[],
          ${ordenadas.map((r) => r.estaba_infectado)}::boolean[],
          ${ordenadas.map((r) => r.tiempo_ms)}::int[]
        ) as t(orden, est, dec, inf, ms)
      returning partida_id
    `;
    const id = filas[0]?.partida_id;
    if (typeof id !== "string") throw new Error("insert sin partida_id");
    return NextResponse.json({ id, puntaje }, { status: 201 });
  } catch (e) {
    logError("POST /api/partidas", e);
    return errorJson(500, "No se pudo guardar la partida");
  }
}
