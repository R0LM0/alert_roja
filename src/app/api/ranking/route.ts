import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import type { Evidencia } from "@/lib/caso-bayesiano";
import { sql } from "@/lib/db";
import { INICIO_TEMPORADA_ACTUAL } from "@/lib/ranking";
import { insignias, PREVALENCIA_EXPERTO, type Respuesta } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const filas = await sql()`
      select id::text as id, jugador, puntaje, prevalencia, creada_en, tiempo_total_ms
      from partidas
      where primer_intento and (${prev}::numeric is null or prevalencia = ${prev}::numeric)
        and creada_en >= ${INICIO_TEMPORADA_ACTUAL}::timestamptz
      order by puntaje desc, tiempo_total_ms asc nulls last, creada_en asc
      limit 10
    `;
    // Consultar solo las rondas ya seleccionadas: una consulta adicional, no una por jugador.
    const respuestas = filas.length ? await sql()`
      select partida_id::text as partida_id, orden, estimacion_pct, decision, evidencia, estaba_infectado
      from respuestas
      where partida_id = any(${filas.map((f) => f.id)}::uuid[])
      order by partida_id, orden
    ` : [];
    const porPartida = new Map<string, (Respuesta & { orden: number; evidencia: Evidencia })[]>();
    for (const r of respuestas) {
      const id = r.partida_id as string;
      const partida = porPartida.get(id) ?? [];
      partida.push({
        orden: Number(r.orden),
        estimacion_pct: r.estimacion_pct === null ? null : Number(r.estimacion_pct),
        decision: r.decision as Respuesta["decision"],
        evidencia: (r.evidencia ?? "sin-antecedentes") as Evidencia,
        estaba_infectado: r.estaba_infectado as boolean,
      });
      porPartida.set(id, partida);
    }
    return NextResponse.json({
      ranking: filas.map((f) => ({
        jugador: f.jugador,
        puntaje: Number(f.puntaje),
        prevalencia: Number(f.prevalencia),
        tiempoTotalMs: f.tiempo_total_ms === null ? null : Number(f.tiempo_total_ms),
        creada_en: new Date(f.creada_en as string).toISOString(),
        insignias: insignias(porPartida.get(f.id as string) ?? [], {
          modo: Number(f.prevalencia) === PREVALENCIA_EXPERTO ? "experto" : "normal",
          ronda: (porPartida.get(f.id as string) ?? []).map((r) => ({ orden: r.orden, evidencia: r.evidencia })),
        }),
      })),
    });
  } catch (e) {
    logError("GET /api/ranking", e);
    return errorJson(500, "No se pudo cargar el ranking");
  }
}
