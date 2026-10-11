import Link from "next/link";

// Provisional: la home y el flujo de juego se rehacen en las fases 2 y 3.
export default function Inicio() {
  return (
    <main>
      <h1>🚨 Alerta Roja</h1>
      <p className="muted">Juego en construcción.</p>
      <Link className="btn sec" href="/panel">Ver panel</Link>
    </main>
  );
}
