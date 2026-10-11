import { createHash, timingSafeEqual } from "node:crypto";
import { errorJson, logError } from "@/lib/api";
import { aCsv } from "@/lib/csv";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const CABECERA = [
  "partida_id",
  "creada_en",
  "jugador",
  "prevalencia",
  "puntaje",
  "orden",
  "estimacion_pct",
  "decision",
  "estaba_infectado",
  "tiempo_ms",
];

/** Comparación en tiempo constante (se comparan hashes de igual longitud). */
function claveValida(recibida: string | null, esperada: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recibida ?? ""), h(esperada));
}

export async function GET(req: Request) {
  const panelKey = process.env.PANEL_KEY;
  if (panelKey && !claveValida(new URL(req.url).searchParams.get("key"), panelKey)) {
    return errorJson(401, "Clave inválida");
  }

  try {
    const filas = await sql()`
      select p.id as partida_id, p.creada_en, p.jugador, p.prevalencia, p.puntaje,
             r.orden, r.estimacion_pct, r.decision, r.estaba_infectado, r.tiempo_ms
      from respuestas r
      join partidas p on p.id = r.partida_id
      order by p.creada_en, p.id, r.orden
    `;
    const csv = aCsv(
      CABECERA,
      filas.map((f) => [
        f.partida_id as string,
        new Date(f.creada_en as string).toISOString(),
        f.jugador as string,
        Number(f.prevalencia),
        Number(f.puntaje),
        Number(f.orden),
        Number(f.estimacion_pct),
        f.decision as string,
        f.estaba_infectado as boolean,
        Number(f.tiempo_ms),
      ]),
    );
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="alerta-roja.csv"',
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    logError("GET /api/export", e);
    return errorJson(500, "No se pudo exportar");
  }
}
