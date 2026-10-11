import { createHash, timingSafeEqual } from "node:crypto";
import { errorJson, logError } from "@/lib/api";
import { aCsv } from "@/lib/csv";
import { cargarDatosExport, leerRespuestas } from "@/lib/export-datos";
import { generarXlsx } from "@/lib/export-xlsx";

export const dynamic = "force-dynamic";

const CABECERA_CSV = [
  "partida_id",
  "creada_en",
  "jugador",
  "prevalencia",
  "puntaje",
  "tiempo_total_ms",
  "primer_intento",
  "orden",
  "estimacion_pct",
  "decision",
  "estaba_infectado",
  "tiempo_ms",
];

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Comparación en tiempo constante (se comparan hashes de igual longitud). */
function claveValida(recibida: string | null, esperada: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recibida ?? ""), h(esperada));
}

/** Fecha de hoy en Managua (UTC−6) como YYYY-MM-DD, para el nombre del archivo. */
function fechaArchivo(d: Date): string {
  return new Date(d.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}

/** Excel por defecto; `?formato=csv` devuelve el CSV (UTF-8 con BOM). Ambos exigen PANEL_KEY si está definida. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const panelKey = process.env.PANEL_KEY;
  if (panelKey && !claveValida(url.searchParams.get("key"), panelKey)) {
    return errorJson(401, "Clave inválida");
  }
  const esCsv = url.searchParams.get("formato") === "csv";

  try {
    if (esCsv) {
      const filas = await leerRespuestas();
      const csv = aCsv(
        CABECERA_CSV,
        filas.map((f) => [
          f.partidaId,
          f.creadaEn.toISOString(),
          f.jugador,
          f.prevalencia,
          f.puntaje,
          f.tiempoTotalMs,
          f.primerIntento,
          f.orden,
          f.estimacionPct,
          f.decision,
          f.estabaInfectado,
          f.tiempoMs,
        ]),
      );
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="alerta-roja-${fechaArchivo(new Date())}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    const datos = await cargarDatosExport();
    const xlsx = await generarXlsx(datos);
    return new Response(new Uint8Array(xlsx), {
      headers: {
        "content-type": TIPO_XLSX,
        "content-disposition": `attachment; filename="alerta-roja-${fechaArchivo(datos.generadoEn)}.xlsx"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    logError("GET /api/export", e);
    return errorJson(500, "No se pudo exportar");
  }
}
