import { NextResponse } from "next/server";
import { errorJson, leerPrevalencia, logError } from "@/lib/api";
import type { Evidencia } from "@/lib/caso-bayesiano";
import { cierreFeria } from "@/lib/cierre";
import { resumirDecisiones, type FilaDecision } from "@/lib/decisiones";
import { sql } from "@/lib/db";
import { INICIO_TEMPORADA_ACTUAL } from "@/lib/ranking";
import { PREVALENCIA, PREVALENCIA_EXPERTO, vppBayes } from "@/lib/stats";

export const dynamic = "force-dynamic";

const LIMITE_FILAS = 200_000;

export async function GET(req: Request) {
  const prev = leerPrevalencia(new URL(req.url));
  if (prev === "invalida") return errorJson(400, "prevalencia debe ser 0.1 o 0.01");

  // Sin filtro, las decisiones son del escenario normal (el panel siempre envía prevalencia).
  const prevDecisiones = prev ?? PREVALENCIA;
  const modalidad = prevDecisiones === PREVALENCIA_EXPERTO ? "experto" : "normal";
  const cierre = cierreFeria();

  try {
    const db = sql();
    // totalPartidas cuenta todas las partidas (contador en vivo); totalJugadores, los primeros intentos.
    // Decisiones y puntaje: solo primeros intentos de la temporada actual y hasta el cierre, como el ranking.
    const [conteo, medias, filas] = await Promise.all([
      db`select count(*)::int as total, (count(*) filter (where primer_intento))::int as jugadores from partidas where (${prev}::numeric is null or prevalencia = ${prev}::numeric)`,
      db`
        select avg(p.puntaje)::float8 as promedio
        from partidas p
        where p.primer_intento
          and p.prevalencia = ${prevDecisiones}::numeric
          and p.creada_en >= ${INICIO_TEMPORADA_ACTUAL}::timestamptz
          and (${cierre}::timestamptz is null or p.creada_en <= ${cierre}::timestamptz)
      `,
      db`
        select r.evidencia, r.decision, r.estaba_infectado
        from respuestas r
        join partidas p on p.id = r.partida_id
        where p.primer_intento
          and r.evidencia is not null
          and p.prevalencia = ${prevDecisiones}::numeric
          and p.creada_en >= ${INICIO_TEMPORADA_ACTUAL}::timestamptz
          and (${cierre}::timestamptz is null or p.creada_en <= ${cierre}::timestamptz)
        order by r.id desc
        limit ${LIMITE_FILAS}
      `,
    ]);

    const decisiones: FilaDecision[] = filas.map((r) => ({
      evidencia: r.evidencia as Evidencia,
      decision: r.decision as FilaDecision["decision"],
      estaba_infectado: r.estaba_infectado as boolean,
    }));
    const resumen = resumirDecisiones(decisiones, modalidad);
    const promedio = medias[0]?.promedio;

    return NextResponse.json({
      prevalencia: prev,
      totalPartidas: Number(conteo[0]?.total ?? 0),
      totalJugadores: Number(conteo[0]?.jugadores ?? 0),
      n: resumen.n,
      vppTeoricoPct: vppBayes(prevDecisiones) * 100,
      vppObservadoPct: resumen.vppObservadoPct,
      decisionesOptimasPct: resumen.decisionesOptimasPct,
      puntajePromedio: promedio === null || promedio === undefined ? null : Number(promedio),
      porEvidencia: resumen.porEvidencia,
    });
  } catch (e) {
    logError("GET /api/stats", e);
    return errorJson(500, "No se pudieron calcular las estadísticas");
  }
}
