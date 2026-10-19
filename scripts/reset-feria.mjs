// Vacía partidas, respuestas y apodos para el día de la feria (base limpia, ids desde 1).
// Uso: npm run db:reset-feria            (solo muestra el destino y los conteos)
//      npm run db:reset-feria -- --confirmar   (borra)
import { abrirConexion } from "./conexion.mjs";

const confirmar = process.argv.includes("--confirmar");

let conexion;
try {
  conexion = abrirConexion();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { query, cerrar, destino } = conexion;

async function contar() {
  const [fila] = await query(
    "select (select count(*)::int from partidas) as partidas, (select count(*)::int from respuestas) as respuestas, (select count(*)::int from apodos) as apodos",
  );
  return `partidas ${fila.partidas}, respuestas ${fila.respuestas}, apodos ${fila.apodos}`;
}

try {
  console.log(`Base: ${destino}`);
  console.log(`Antes: ${await contar()}`);
  if (!confirmar) {
    console.log("No se borró nada. Para vaciar: npm run db:reset-feria -- --confirmar");
  } else {
    await query("truncate respuestas, partidas, apodos restart identity");
    console.log(`Vaciadas. Después: ${await contar()}`);
  }
} catch (e) {
  console.error("Falló el reinicio:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await cerrar();
}
