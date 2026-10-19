import type { Evidencia } from "./caso-bayesiano";
import { cierreFeria } from "./cierre";
import { sql } from "./db";
import {
  modoDePrevalencia,
  resumirEvidencias,
  totalDecisiones,
  interpretarDecisiones,
  type RespuestaDecision,
} from "./export-decisiones";
import type { DatosExport, DificultadExport, FilaRankingExport, FilaRespuestaExport } from "./export-xlsx";
import { INICIO_TEMPORADA_ACTUAL, construirHistograma } from "./ranking";
import { armarPodio } from "./podio";
import { leerRankingTemporada, type FilaRanking } from "./ranking-consulta";
import { PREVALENCIA, PREVALENCIA_EXPERTO, vppBayes } from "./stats";

export const LIMITE_RANKING_EXPORT = 20;

const DIFICULTADES = [
  { prevalencia: PREVALENCIA, nombre: "Normal" },
  { prevalencia: PREVALENCIA_EXPERTO, nombre: "Experto" },
] as const;

/** Mismo alcance que el ranking y el podio: desde el inicio de la temporada y hasta el cierre (si lo hay). */
export function enAlcanceFeria(creadaEn: Date, cierre: Date | null): boolean {
  const t = creadaEn.getTime();
  return t >= Date.parse(INICIO_TEMPORADA_ACTUAL) && (cierre === null || t <= cierre.getTime());
}

/** Todas las respuestas con su partida (incluye intentos repetidos). Solo lectura, parametrizado. */
export async function leerRespuestas(): Promise<FilaRespuestaExport[]> {
  const filas = await sql()`
    select p.id::text as partida_id, p.creada_en, p.jugador, p.prevalencia, p.puntaje,
           p.tiempo_total_ms, p.primer_intento,
           r.orden, r.estimacion_pct, r.decision, r.evidencia, r.estaba_infectado, r.tiempo_ms
    from respuestas r
    join partidas p on p.id = r.partida_id
    order by p.creada_en, p.id, r.orden
  `;
  return filas.map((f) => ({
    partidaId: f.partida_id as string,
    creadaEn: new Date(f.creada_en as string),
    jugador: f.jugador as string,
    prevalencia: Number(f.prevalencia),
    puntaje: Number(f.puntaje),
    tiempoTotalMs: f.tiempo_total_ms === null ? null : Number(f.tiempo_total_ms),
    primerIntento: Boolean(f.primer_intento),
    enInforme: false,
    orden: Number(f.orden),
    evidencia: (f.evidencia ?? null) as Evidencia | null,
    estimacionPct: f.estimacion_pct === null ? null : Number(f.estimacion_pct),
    decision: f.decision as "aislar" | "liberar",
    estabaInfectado: Boolean(f.estaba_infectado),
    tiempoMs: Number(f.tiempo_ms),
  }));
}

/**
 * Estadísticas de una modalidad a partir de las respuestas. Solo cuentan partidas del alcance del
 * informe; "jugadores" y las decisiones usan solo el primer intento de cada apodo.
 */
export function construirDificultad(
  prevalencia: number,
  nombre: string,
  respuestas: FilaRespuestaExport[],
  ranking: FilaRankingExport[],
  cierre: Date | null,
): DificultadExport {
  const modo = modoDePrevalencia(prevalencia);
  const enAlcance = respuestas.filter((r) => r.prevalencia === prevalencia && enAlcanceFeria(r.creadaEn, cierre));
  const partidas = new Map<string, FilaRespuestaExport>();
  for (const r of enAlcance) if (!partidas.has(r.partidaId)) partidas.set(r.partidaId, r);
  const primeras = [...partidas.values()].filter((r) => r.primerIntento);
  const decisiones = enAlcance.filter((r) => r.primerIntento);
  const rs: RespuestaDecision[] = decisiones.map((r) => ({
    evidencia: r.evidencia,
    decision: r.decision,
    estabaInfectado: r.estabaInfectado,
  }));
  const filas = resumirEvidencias(rs, modo);
  const total = totalDecisiones(rs, modo);
  const puntajes = primeras.map((r) => r.puntaje);
  return {
    prevalencia,
    nombre,
    partidas: partidas.size,
    jugadores: primeras.length,
    puntajePromedio: puntajes.length ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length : null,
    vppTeoricoPct: vppBayes(prevalencia) * 100,
    decisiones: filas,
    totalCasos: total.casos,
    pctAisloTotal: total.pctAislo,
    pctOptimasTotal: total.pctOptimas,
    lecturas: interpretarDecisiones(filas, total),
    histograma: construirHistograma(decisiones.flatMap((r) => (r.estimacionPct === null ? [] : [r.estimacionPct]))),
    ranking,
  };
}

export async function cargarDatosExport(): Promise<DatosExport> {
  const cierreIso = cierreFeria();
  const cierre = cierreIso === null ? null : new Date(cierreIso);
  const respuestas = await leerRespuestas();
  const rankings: FilaRanking[][] = await Promise.all(
    DIFICULTADES.map((d) =>
      leerRankingTemporada({ prevalencia: d.prevalencia, cierre: cierreIso, limite: LIMITE_RANKING_EXPORT }),
    ),
  );
  const dificultades = DIFICULTADES.map((d, i) =>
    construirDificultad(
      d.prevalencia,
      d.nombre,
      respuestas,
      rankings[i].map((f) => ({
        jugador: f.jugador,
        puntaje: f.puntaje,
        tiempoTotalMs: f.tiempoTotalMs,
        creadaEn: new Date(f.creada_en),
      })),
      cierre,
    ),
  );
  return {
    generadoEn: new Date(),
    cierre,
    hayEstimaciones: dificultades.some((d) => d.histograma.some((c) => c.cantidad > 0)),
    dificultades,
    podio: armarPodio(rankings.flat()),
    respuestas: respuestas.map((r) => ({ ...r, enInforme: r.primerIntento && enAlcanceFeria(r.creadaEn, cierre) })),
  };
}
