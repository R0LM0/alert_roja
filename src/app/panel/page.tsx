import Link from "next/link";

// Provisional: el panel en vivo se rehace en la fase 5 (usa /api/stats y /api/ranking).
export default function Panel() {
  return (
    <main>
      <h1>📊 Panel</h1>
      <p className="muted">Panel en construcción.</p>
      <Link className="btn sec" href="/">Volver</Link>
    </main>
  );
}
