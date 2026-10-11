import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

type Fila = Record<string, unknown>;
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Fila[]>;

const globalPool = globalThis as unknown as { __pool?: Pool };

/**
 * Neon (producción, driver HTTP serverless) o Postgres estándar (docker local).
 * El host decide: si la URL contiene "neon.tech" se usa el driver de Neon.
 */
export function sql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");

  if (url.includes("neon.tech")) {
    // El driver HTTP no soporta channel_binding (Neon lo agrega al copiar la URL).
    return neon(url.replace(/([?&])channel_binding=[^&]*&?/, "$1").replace(/[?&]$/, "")) as unknown as Sql;
  }

  const pool = (globalPool.__pool ??= new Pool({ connectionString: url, max: 5 }));
  return async (strings, ...values) => {
    const texto = strings.reduce((acc, parte, i) => acc + parte + (i < values.length ? `$${i + 1}` : ""), "");
    const res = await pool.query(texto, values as unknown[]);
    return res.rows as Fila[];
  };
}
