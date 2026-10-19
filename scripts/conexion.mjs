// Conexión compartida de los scripts de base (migrate, reset-feria).
// Mismo criterio que src/lib/db.ts: neon.tech -> driver Neon, si no pg.
import { neon } from "@neondatabase/serverless";
import pg from "pg";

/** Host y base sin credenciales, para mostrar a dónde se conecta el script. */
export function describirDestino(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}/${u.pathname.replace(/^\//, "")}`;
  } catch {
    return "(URL no válida)";
  }
}

export function abrirConexion(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("Falta DATABASE_URL (definila en .env.local o en el entorno).");

  if (url.includes("neon.tech")) {
    // El driver HTTP no soporta channel_binding (Neon lo agrega al copiar la URL).
    const db = neon(url.replace(/([?&])channel_binding=[^&]*&?/, "$1").replace(/[?&]$/, ""));
    return {
      destino: describirDestino(url),
      query: (texto, params = []) => db.query(texto, params),
      cerrar: async () => {},
    };
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  return {
    destino: describirDestino(url),
    query: async (texto, params = []) => (await pool.query(texto, params)).rows,
    cerrar: () => pool.end(),
  };
}
