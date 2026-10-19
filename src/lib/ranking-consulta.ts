import { sql } from "./db";
import type { FilaPodio } from "./podio";
import { INICIO_TEMPORADA_ACTUAL } from "./ranking";

/** Fila del ranking de temporada con su id. `dueno` solo se usa en el servidor (aviso del podio). */
export type FilaRanking = FilaPodio & { id: string };

/**
 * Primer intento por apodo y dificultad dentro de la temporada y hasta el cierre (si lo hay).
 * El cierre filtra antes de elegir el primer intento: una partida tardía nunca cambia al ganador.
 * Solo lectura, parametrizado. Úsala para /api/ranking y para el podio.
 */
export async function leerRankingTemporada({
  prevalencia,
  cierre,
  limite,
}: {
  prevalencia: number | null;
  cierre: string | null;
  limite: number;
}): Promise<FilaRanking[]> {
  const filas = await sql()`
    with temporada as (
      select distinct on (lower(btrim(p.jugador)), p.prevalencia)
        p.id, p.jugador, p.puntaje, p.prevalencia, p.creada_en, p.tiempo_total_ms
      from partidas p
      where (${prevalencia}::numeric is null or p.prevalencia = ${prevalencia}::numeric)
        and p.creada_en >= ${INICIO_TEMPORADA_ACTUAL}::timestamptz
        and (${cierre}::timestamptz is null or p.creada_en <= ${cierre}::timestamptz)
      order by lower(btrim(p.jugador)), p.prevalencia, p.creada_en, p.id
    )
    select t.id::text as id, t.jugador, t.puntaje, t.prevalencia, t.creada_en, t.tiempo_total_ms,
           a.dueno::text as dueno
    from temporada t
    left join apodos a on a.apodo_norm = lower(btrim(t.jugador))
    order by t.puntaje desc, t.tiempo_total_ms asc nulls last, t.creada_en asc
    limit ${limite}
  `;
  return filas.map((f) => ({
    id: f.id as string,
    jugador: f.jugador as string,
    puntaje: Number(f.puntaje),
    prevalencia: Number(f.prevalencia),
    tiempoTotalMs: f.tiempo_total_ms === null ? null : Number(f.tiempo_total_ms),
    creada_en: new Date(f.creada_en as string).toISOString(),
    dueno: (f.dueno as string | null) ?? null,
  }));
}
