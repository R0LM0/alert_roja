import { NextResponse } from "next/server";
import { reclamarApodo } from "@/lib/apodos-db";
import { errorJson, logError } from "@/lib/api";
import { puntajeDeRespuestas, type ModalidadCaso } from "@/lib/caso-bayesiano";
import { sql } from "@/lib/db";
import { clientIp, crearLimitador } from "@/lib/rate-limit";
import { partidaSchema } from "@/lib/schema";
import { PREVALENCIA_EXPERTO } from "@/lib/stats";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024;
const limitador = crearLimitador({ max: 10, ventanaMs: 60_000 });

/** 23505 = unique_violation (pg y driver HTTP de Neon exponen `code`). */
function esViolacionUnica(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";
}

type Respuestas = ReturnType<typeof partidaSchema.parse>["respuestas"];

/**
 * Una sola sentencia (CTE) = atómica en pg y en Neon HTTP; todo parametrizado.
 * `on conflict do nothing`: un id repetido nunca modifica la fila existente y, como
 * `p` queda vacío, tampoco se insertan respuestas duplicadas. Si ya existía, se
 * devuelve el id y el puntaje guardados (el segundo select).
 * `primer_intento` lo decide el servidor dentro de la misma sentencia: es el primero si
 * no hay otra partida del mismo apodo (sin mayúsculas/espacios) y dificultad.
 */
function guardar(
  id: string,
  jugador: string,
  prevalencia: number,
  puntaje: number,
  tiempoTotalMs: number,
  ordenadas: Respuestas,
  forzarRepetido: boolean,
) {
  return sql()`
    with p as (
      insert into partidas (id, jugador, prevalencia, puntaje, tiempo_total_ms, primer_intento)
      select ${id}::uuid, ${jugador}, ${prevalencia}, ${puntaje}, ${tiempoTotalMs}::int,
        not ${forzarRepetido}::boolean and not exists (
          select 1 from partidas x
          where lower(btrim(x.jugador)) = lower(btrim(${jugador}::text)) and x.prevalencia = ${prevalencia}::numeric
        )
      on conflict (id) do nothing
      returning id, puntaje
    ),
    r as (
      insert into respuestas (partida_id, orden, estimacion_pct, decision, evidencia, estaba_infectado, tiempo_ms)
      select p.id, t.orden, t.est, t.dec, t.ev, t.inf, t.ms
      from p,
        unnest(
          ${ordenadas.map((r) => r.orden)}::smallint[],
          ${ordenadas.map((r) => r.estimacion_pct ?? null)}::smallint[],
          ${ordenadas.map((r) => r.decision)}::text[],
          ${ordenadas.map((r) => r.evidencia)}::text[],
          ${ordenadas.map((r) => r.estaba_infectado)}::boolean[],
          ${ordenadas.map((r) => r.tiempo_ms)}::int[]
        ) as t(orden, est, dec, ev, inf, ms)
      returning 1
    )
    select p.id::text as id, p.puntaje, true as nueva from p
    union all
    select x.id::text, x.puntaje, false from partidas x
    where x.id = ${id}::uuid and not exists (select 1 from p)
  `;
}

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

  const { jugador, dueno, prevalencia, respuestas } = parsed.data;
  // Clave de idempotencia: la del cliente (reintentos) o una nueva.
  const id = parsed.data.id ?? crypto.randomUUID();
  const ordenadas = [...respuestas].sort((a, b) => a.orden - b.orden);
  // El puntaje del cliente se ignora: se recalcula aquí con la evidencia de cada paciente.
  const modalidad: ModalidadCaso = prevalencia === PREVALENCIA_EXPERTO ? "experto" : "normal";
  const puntaje = puntajeDeRespuestas(ordenadas, modalidad);

  const tiempoTotalMs = ordenadas.reduce((a, r) => a + r.tiempo_ms, 0);

  try {
    // Apodo de otro dispositivo: no se guarda. Si está libre, queda reservado aquí (idempotente).
    if (!(await reclamarApodo(jugador, dueno))) return errorJson(409, "Ese apodo ya está en uso");
    let filas: Awaited<ReturnType<typeof guardar>>;
    try {
      filas = await guardar(id, jugador, prevalencia, puntaje, tiempoTotalMs, ordenadas, false);
    } catch (e) {
      // Dos primeros intentos del mismo apodo chocaron en el índice único parcial
      // (partidas_primer_intento_uk): el perdedor se guarda como intento repetido.
      if (!esViolacionUnica(e)) throw e;
      filas = await guardar(id, jugador, prevalencia, puntaje, tiempoTotalMs, ordenadas, true);
    }
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
