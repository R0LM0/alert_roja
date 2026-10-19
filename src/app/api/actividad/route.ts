import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Últimas partidas (todos los intentos) para el feed "Acaban de jugar" del panel. */
export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const filas = await sql()`
      select id::text as id, jugador, puntaje, creada_en, primer_intento
      from partidas
      where (${prev}::numeric is null or prevalencia = ${prev}::numeric)
      order by creada_en desc, id desc
      limit 8
    `;
    return NextResponse.json({
      actividad: filas.map((f) => ({
        id: String(f.id),
        jugador: String(f.jugador),
        puntaje: Number(f.puntaje),
        creada_en: new Date(f.creada_en as string).toISOString(),
        primer_intento: Boolean(f.primer_intento),
      })),
    });
  } catch (e) {
    logError("GET /api/actividad", e);
    return errorJson(500, "No se pudo cargar la actividad");
  }
}
