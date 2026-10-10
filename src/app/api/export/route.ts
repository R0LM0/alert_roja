import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const filas = await sql()`
    select id, creada_en, ronda_id, jugador, estimacion_pct, decision, estaba_infectado
    from respuestas
    order by id
  `;
  const cab = "id,creada_en,ronda_id,jugador,estimacion_pct,decision,estaba_infectado";
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lineas = filas.map((f) =>
    [
      f.id,
      new Date(f.creada_en as string).toISOString(),
      f.ronda_id,
      esc(f.jugador),
      f.estimacion_pct,
      f.decision,
      f.estaba_infectado ? 1 : 0,
    ].join(","),
  );
  return new Response([cab, ...lineas].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="alerta-roja.csv"',
    },
  });
}
