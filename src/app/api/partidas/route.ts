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
  // Clave de idempotencia: la del cliente (reintentos) o una nueva.
  const id = parsed.data.id ?? crypto.randomUUID();
  const ordenadas = [...respuestas].sort((a, b) => a.orden - b.orden);
  // El puntaje del cliente se ignora: se recalcula aquí.
  const puntaje = puntajePartida(ordenadas, prevalencia);

  try {
    // Una sola sentencia (CTE) = atómica en pg y en Neon HTTP; todo parametrizado.
    // `on conflict do nothing`: un id repetido nunca modifica la fila existente y, como
    // `p` queda vacío, tampoco se insertan respuestas duplicadas. Si ya existía, se
    // devuelve el id y el puntaje guardados (el segundo select).
    const filas = await sql()`
      with p as (
        insert into partidas (id, jugador, prevalencia, puntaje)
        values (${id}::uuid, ${jugador}, ${prevalencia}, ${puntaje})
        on conflict (id) do nothing
        returning id, puntaje
      ),
      r as (
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
        returning 1
      )
      select p.id::text as id, p.puntaje, true as nueva from p
      union all
      select x.id::text, x.puntaje, false from partidas x
      where x.id = ${id}::uuid and not exists (select 1 from p)
    `;
    let fila = filas[0];
    if (!fila) {
      // Carrera con una petición idéntica en vuelo: su commit aún no era visible
      // para el snapshot de esta sentencia. Ya existe; se lee ahora.
      fila = (await sql()`select id::text as id, puntaje, false as nueva from partidas where id = ${id}::uuid`)[0];
    }
    if (!fila || typeof fila.id !== "string") throw new Error("insert sin partida");
    return NextResponse.json({ id: fila.id, puntaje: Number(fila.puntaje) }, { status: fila.nueva ? 201 : 200 });
  } catch (e) {
    logError("POST /api/partidas", e);
    return errorJson(500, "No se pudo guardar la partida");
  }
}
