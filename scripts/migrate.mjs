// Aplica db/migrations/*.sql en orden y registra los aplicados en schema_migrations.
// Uso: npm run db:migrate (lee DATABASE_URL de .env.local si existe).
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { abrirConexion } from "./conexion.mjs";

let conexion;
try {
  conexion = abrirConexion();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { query, cerrar } = conexion;

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const archivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

try {
  await query(
    "create table if not exists schema_migrations (nombre text primary key, aplicada_en timestamptz not null default now())",
  );
  const hechas = new Set((await query("select nombre from schema_migrations")).map((r) => r.nombre));
  for (const f of archivos) {
    if (hechas.has(f)) {
      console.log(`= ${f} (ya aplicada)`);
      continue;
    }
    const contenido = await readFile(join(dir, f), "utf8");
    // Una sentencia por llamada (el driver HTTP de Neon no admite varias a la vez).
    const sentencias = contenido
      .split(/;\s*$/m)
      .map((x) => x.replace(/^\s*--.*$/gm, "").trim())
      .filter(Boolean);
    for (const s of sentencias) await query(s);
    await query("insert into schema_migrations (nombre) values ($1)", [f]);
    console.log(`+ ${f}`);
  }
  console.log("Migraciones al día.");
} catch (e) {
  console.error("Falló la migración:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await cerrar();
}
