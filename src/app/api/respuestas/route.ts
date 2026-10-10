import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rondaSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Rate limit en memoria por instancia: suficiente para una feria.
// Para algo más serio, usar Upstash/Vercel KV.
const VENTANA_MS = 10_000;
const MAX_POR_VENTANA = 5;
const hits = new Map<string, number[]>();

function limitado(ip: string): boolean {
  const ahora = Date.now();
  const recientes = (hits.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  recientes.push(ahora);
  hits.set(ip, recientes);
  return recientes.length > MAX_POR_VENTANA;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limitado(ip)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const texto = await req.text();
  if (texto.length > 4_000) {
    return NextResponse.json({ error: "Cuerpo demasiado grande" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = rondaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.flatten() }, { status: 400 });
  }

  const { ronda_id, jugador, respuestas } = parsed.data;
  const db = sql();
  await Promise.all(
    respuestas.map(
      (r) => db`
        insert into respuestas (ronda_id, jugador, estimacion_pct, decision, estaba_infectado)
        values (${ronda_id}, ${jugador}, ${r.estimacion_pct}, ${r.decision}, ${r.estaba_infectado})
      `,
    ),
  );
  return NextResponse.json({ ok: true, guardadas: respuestas.length }, { status: 201 });
}

export async function GET() {
  const filas = await sql()`
    select estimacion_pct, decision, estaba_infectado
    from respuestas
    order by creada_en desc
    limit 5000
  `;
  return NextResponse.json({ respuestas: filas });
}
