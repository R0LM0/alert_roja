import { sql } from "./db";
import type { DatosExport, DificultadExport, FilaRespuestaExport } from "./export-xlsx";
import { construirHistograma } from "./ranking";
import { PREVALENCIA, PREVALENCIA_EXPERTO, resumir } from "./stats";

export const LIMITE_RANKING_EXPORT = 20;

const DIFICULTADES = [
  { prevalencia: PREVALENCIA, nombre: "Normal" },
  { prevalencia: PREVALENCIA_EXPERTO, nombre: "Experto" },
] as const;

/** Todas las respuestas con su partida (incluye intentos repetidos). Solo lectura, parametrizado. */
export async function leerRespuestas(): Promise<FilaRespuestaExport[]> {
  const filas = await sql()`
    select p.id::text as partida_id, p.creada_en, p.jugador, p.prevalencia, p.puntaje,
           p.tiempo_total_ms, p.primer_intento,
           r.orden, r.estimacion_pct, r.decision, r.estaba_infectado, r.tiempo_ms
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
    orden: Number(f.orden),
    estimacionPct: f.estimacion_pct === null ? null : Number(f.estimacion_pct),
    decision: f.decision as "aislar" | "liberar",
    estabaInfectado: Boolean(f.estaba_infectado),
    tiempoMs: Number(f.tiempo_ms),
  }));
}

/** Resumen, histograma y ranking de una dificultad; las cifras usan solo primeros intentos. */
export async function leerDificultad(
  prevalencia: number,
  nombre: string,
  respuestas: FilaRespuestaExport[],
): Promise<DificultadExport> {
  const db = sql();
  const [conteo, ranking] = await Promise.all([
    db`select count(*)::int as total, (count(*) filter (where primer_intento))::int as jugadores
       from partidas where prevalencia = ${prevalencia}::numeric`,
    db`select jugador, puntaje, tiempo_total_ms, creada_en
       from partidas
       where primer_intento and prevalencia = ${prevalencia}::numeric
       order by puntaje desc, tiempo_total_ms asc nulls last, creada_en asc
       limit ${LIMITE_RANKING_EXPORT}`,
  ]);
  const primeras = respuestas.filter((r) => r.primerIntento && r.prevalencia === prevalencia);
  const resumen = resumir(
    primeras.map((r) => ({ estimacion_pct: r.estimacionPct, decision: r.decision, estaba_infectado: r.estabaInfectado })),
    prevalencia,
  );
  return {
    prevalencia,
    nombre,
    partidas: Number(conteo[0]?.total ?? 0),
    jugadores: Number(conteo[0]?.jugadores ?? 0),
    estimacionPromedioPct: resumen.estimacionPromedioPct,
    vppObservadoPct: resumen.vppObservadoPct,
    vppTeoricoPct: resumen.vppTeoricoPct,
    pctSobreestiman: resumen.pctSobreestiman,
    histograma: construirHistograma(primeras.flatMap((r) => r.estimacionPct === null ? [] : [r.estimacionPct])),
    ranking: ranking.map((f) => ({
      jugador: f.jugador as string,
      puntaje: Number(f.puntaje),
      tiempoTotalMs: f.tiempo_total_ms === null ? null : Number(f.tiempo_total_ms),
      creadaEn: new Date(f.creada_en as string),
    })),
  };
}

export async function cargarDatosExport(): Promise<DatosExport> {
  const respuestas = await leerRespuestas();
  const dificultades = await Promise.all(DIFICULTADES.map((d) => leerDificultad(d.prevalencia, d.nombre, respuestas)));
  return { generadoEn: new Date(), dificultades, respuestas };
}
