"use client";

import Link from "next/link";
import useSWR from "swr";
import { Ciudad } from "@/components/Ciudad";
import { resumir, vpnBayes, type Respuesta } from "@/lib/stats";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Error"))));

export default function Panel() {
  const { data, error } = useSWR<{ respuestas: Respuesta[] }>("/api/respuestas", fetcher, {
    refreshInterval: 4000,
  });

  if (error) return <main><h1>Panel</h1><p>No se pudo cargar. ¿Está configurada DATABASE_URL?</p></main>;
  if (!data) return <main><h1>Panel</h1><p className="muted">Cargando…</p></main>;

  const r = resumir(data.respuestas);
  const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);

  return (
    <main>
      <h1>📊 Panel del público</h1>
      <p className="muted">{r.n} respuestas · se actualiza cada 4 s</p>

      <div className="card">
        <h2>¿Qué estima el público vs. la realidad?</h2>
        <div className="row">
          <div><p className="muted">Estimación promedio</p><p className="big">{pct(r.estimacionPromedioPct)}</p></div>
          <div><p className="muted">VPP observado</p><p className="big">{pct(r.vppObservadoPct)}</p></div>
          <div><p className="muted">VPP teórico (Bayes)</p><p className="big" style={{ color: "var(--red)" }}>{pct(r.vppTeoricoPct)}</p></div>
        </div>
        <p>
          <b>{pct(r.pctSobreestiman)}</b> de las estimaciones fue mayor que el valor real ·{" "}
          <b>{pct(r.pctAislados)}</b> de los positivos fue aislado.
        </p>
        <p className="muted">VPN teórico: {(vpnBayes() * 100).toFixed(2)}%</p>
      </div>

      <div className="card">
        <h2>Frecuencias naturales (1000 personas)</h2>
        <Ciudad />
      </div>

      <div className="row">
        <a className="btn" href="/api/export">⬇ Exportar CSV (Excel / SPSS)</a>
        <Link className="btn sec" href="/">Volver al juego</Link>
      </div>
    </main>
  );
}
