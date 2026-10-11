import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const filas = await sql()`
      select jugador, puntaje, prevalencia, creada_en
      from partidas
      where (${prev}::numeric is null or prevalencia = ${prev}::numeric)
      order by puntaje desc, creada_en asc
      limit 10
    `;
    return NextResponse.json({
      ranking: filas.map((f) => ({
        jugador: f.jugador,
        puntaje: Number(f.puntaje),
        prevalencia: Number(f.prevalencia),
        creada_en: new Date(f.creada_en as string).toISOString(),
      })),
    });
  } catch (e) {
    logError("GET /api/ranking", e);
    return errorJson(500, "No se pudo cargar el ranking");
  }
}
