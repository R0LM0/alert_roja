// Acceso a la tabla apodos (solo servidor).
import { normalizarApodo } from "./apodos";
import { sql } from "./db";

/**
 * Reclama el apodo para `dueno` si está libre. True si ahora le pertenece a ese dueño.
 * El insert con on conflict es atómico. El select va en otra sentencia para leer al
 * ganador de una carrera ya confirmada (en READ COMMITTED una sola sentencia no la vería).
 */
export async function reclamarApodo(apodo: string, dueno: string): Promise<boolean> {
  const norm = normalizarApodo(apodo);
  await sql()`
    insert into apodos (apodo_norm, apodo, dueno)
    values (${norm}, ${apodo}, ${dueno}::uuid)
    on conflict (apodo_norm) do nothing
  `;
  const filas = await sql()`select dueno::text as dueno from apodos where apodo_norm = ${norm}`;
  return filas[0]?.dueno === dueno.toLowerCase();
}

/** Cuáles de los candidatos ya están reservados (normalizados). */
export async function apodosOcupados(candidatos: string[]): Promise<Set<string>> {
  const normalizados = candidatos.map(normalizarApodo);
  const filas = await sql()`select apodo_norm from apodos where apodo_norm = any(${normalizados}::text[])`;
  return new Set(filas.map((f) => String(f.apodo_norm)));
}
