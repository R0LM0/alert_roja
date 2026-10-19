import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import type { Evidencia } from "@/lib/caso-bayesiano";
import { cierreFeria } from "@/lib/cierre";
import { sql } from "@/lib/db";
import { leerRankingTemporada } from "@/lib/ranking-consulta";
import { insignias, PREVALENCIA_EXPERTO, type Respuesta } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  try {
    const filas = await leerRankingTemporada({ prevalencia: prev, cierre: cierreFeria(), limite: 10 });
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
      // Sin id ni dueno: el público no recibe ni la partida ni el dispositivo.
      ranking: filas.map((f) => ({
        jugador: f.jugador,
        puntaje: f.puntaje,
        prevalencia: f.prevalencia,
        tiempoTotalMs: f.tiempoTotalMs,
        creada_en: f.creada_en,
        insignias: insignias(porPartida.get(f.id) ?? [], {
          modo: f.prevalencia === PREVALENCIA_EXPERTO ? "experto" : "normal",
          ronda: (porPartida.get(f.id) ?? []).map((r) => ({ orden: r.orden, evidencia: r.evidencia })),
        }),
      })),
    });
  } catch (e) {
    logError("GET /api/ranking", e);
    return errorJson(500, "No se pudo cargar el ranking");
  }
}
