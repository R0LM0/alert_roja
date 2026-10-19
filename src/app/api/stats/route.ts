import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import { sql } from "@/lib/db";
import { construirHistograma } from "@/lib/ranking";
import { resumir, type Respuesta } from "@/lib/stats";

export const dynamic = "force-dynamic";

const LIMITE_FILAS = 200_000;

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const db = sql();
    // Estimaciones del público: solo primeros intentos (después de la revelación ya no son comparables).
    // totalPartidas cuenta todas las partidas (contador en vivo); totalJugadores, los primeros intentos.
    const [conteo, filas] = await Promise.all([
      db`select count(*)::int as total, (count(*) filter (where primer_intento))::int as jugadores from partidas where (${prev}::numeric is null or prevalencia = ${prev}::numeric)`,
      db`
        select r.estimacion_pct, r.decision, r.estaba_infectado
        from respuestas r
        join partidas p on p.id = r.partida_id
        where p.primer_intento and (${prev}::numeric is null or p.prevalencia = ${prev}::numeric)
        order by r.id desc
        limit ${LIMITE_FILAS}
      `,
    ]);

    const rs = filas as unknown as Respuesta[];
    // Sin filtro, el VPP teórico es el del escenario normal (10 %).
    const resumen = resumir(rs, prev ?? 0.1);
    const histograma = construirHistograma(rs.flatMap((r) => r.estimacion_pct === null ? [] : [Number(r.estimacion_pct)]));

    return NextResponse.json({
      prevalencia: prev,
      totalPartidas: Number(conteo[0]?.total ?? 0),
      totalJugadores: Number(conteo[0]?.jugadores ?? 0),
      ...resumen,
      histograma,
    });
  } catch (e) {
    logError("GET /api/stats", e);
    return errorJson(500, "No se pudieron calcular las estadísticas");
  }
}
