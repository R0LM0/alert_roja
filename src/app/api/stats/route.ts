import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import { sql } from "@/lib/db";
import { resumir, type Respuesta } from "@/lib/stats";

export const dynamic = "force-dynamic";

const LIMITE_FILAS = 200_000;
const CUBETAS = 10;

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const db = sql();
    const [conteo, filas] = await Promise.all([
      db`select count(*)::int as total from partidas where (${prev}::numeric is null or prevalencia = ${prev}::numeric)`,
      db`
        select r.estimacion_pct, r.decision, r.estaba_infectado
        from respuestas r
        join partidas p on p.id = r.partida_id
        where (${prev}::numeric is null or p.prevalencia = ${prev}::numeric)
        order by r.id desc
        limit ${LIMITE_FILAS}
      `,
    ]);

    const rs = filas as unknown as Respuesta[];
    // Sin filtro, el VPP teórico es el del escenario normal (10 %).
    const resumen = resumir(rs, prev ?? 0.1);
    // 10 cubetas de 10 puntos: 0-9, 10-19, ..., 90-100.
    const histograma = Array.from({ length: CUBETAS }, (_, i) => ({
      desde: i * 10,
      hasta: i === CUBETAS - 1 ? 100 : i * 10 + 9,
      cantidad: 0,
    }));
    for (const r of rs) histograma[Math.min(Math.floor(Number(r.estimacion_pct) / 10), CUBETAS - 1)].cantidad++;

    return NextResponse.json({
      prevalencia: prev,
      totalPartidas: Number(conteo[0]?.total ?? 0),
      ...resumen,
      histograma,
    });
  } catch (e) {
    logError("GET /api/stats", e);
    return errorJson(500, "No se pudieron calcular las estadísticas");
  }
}
