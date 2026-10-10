"use client";

import Link from "next/link";
import { useState } from "react";
import { Ciudad } from "@/components/Ciudad";
import {
  ESPECIFICIDAD,
  PACIENTES_POR_RONDA,
  PREVALENCIA,
  SENSIBILIDAD,
  resumir,
  sortearPositivo,
  vppBayes,
  type Respuesta,
} from "@/lib/stats";

type Fase = "inicio" | "jugando" | "resultado";

export default function Juego() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [jugador, setJugador] = useState("");
  const [paciente, setPaciente] = useState(1);
  const [infectado, setInfectado] = useState<boolean>(() => sortearPositivo().infectado);
  const [estimacion, setEstimacion] = useState(90);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [rondaId, setRondaId] = useState("");
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");

  function empezar() {
    setRondaId(crypto.randomUUID());
    setRespuestas([]);
    setPaciente(1);
    setInfectado(sortearPositivo().infectado);
    setEstimacion(90);
    setEstado("idle");
    setFase("jugando");
  }

  async function guardar(rs: Respuesta[]) {
    setEstado("guardando");
    try {
      const res = await fetch("/api/respuestas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ronda_id: rondaId, jugador: jugador.trim(), respuestas: rs }),
      });
      setEstado(res.ok ? "ok" : "error");
    } catch {
      setEstado("error");
    }
  }

  function decidir(decision: "aislar" | "liberar") {
    const nueva: Respuesta = { estimacion_pct: estimacion, decision, estaba_infectado: infectado };
    const rs = [...respuestas, nueva];
    setRespuestas(rs);
    if (paciente >= PACIENTES_POR_RONDA) {
      setFase("resultado");
      void guardar(rs);
    } else {
      setPaciente(paciente + 1);
      setInfectado(sortearPositivo().infectado);
      setEstimacion(90);
    }
  }

  if (fase === "inicio") {
    return (
      <main>
        <h1>🚨 Alerta Roja</h1>
        <p className="muted">Sos el director de salud de una ciudad de 1000 personas.</p>
        <div className="card">
          <p>
            Hay un virus: <b>{PREVALENCIA * 100}%</b> de la ciudad está infectada. La prueba rápida acierta{" "}
            <b>{SENSIBILIDAD * 100}%</b> con los infectados y da falsa alarma al <b>{(1 - ESPECIFICIDAD) * 100}%</b> de
            los sanos.
          </p>
          <p>
            Te van a llegar <b>{PACIENTES_POR_RONDA} pacientes que dieron POSITIVO</b>. Para cada uno: estimá qué tan
            probable es que de verdad esté infectado y decidí si lo aislás o lo liberás.
          </p>
          <label htmlFor="nombre" className="muted">Tu nombre o apodo</label>
          <input id="nombre" type="text" maxLength={40} value={jugador} onChange={(e) => setJugador(e.target.value)} />
          <p>
            <button disabled={jugador.trim().length === 0} onClick={empezar}>Empezar</button>{" "}
            <Link className="btn sec" href="/panel">Ver panel</Link>
          </p>
        </div>
      </main>
    );
  }

  if (fase === "jugando") {
    return (
      <main>
        <h1>Paciente {paciente} de {PACIENTES_POR_RONDA}</h1>
        <div className="card">
          <p className="big" style={{ color: "var(--red)" }}>Prueba: POSITIVO</p>
          <p>¿Qué probabilidad hay de que esté realmente infectado?</p>
          <p className="big">{estimacion}%</p>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={estimacion}
            aria-label="Probabilidad estimada"
            onChange={(e) => setEstimacion(Number(e.target.value))}
          />
          <div className="row" style={{ marginTop: 16 }}>
            <button onClick={() => decidir("aislar")}>🔒 Aislar</button>
            <button className="sec" onClick={() => decidir("liberar")}>🚪 Liberar</button>
          </div>
        </div>
      </main>
    );
  }

  const r = resumir(respuestas);
  const vpp = vppBayes() * 100;
  return (
    <main>
      <h1>Resultado</h1>
      <div className="card">
        <p className="muted">Tu estimación promedio</p>
        <p className="big">{r.estimacionPromedioPct?.toFixed(0)}%</p>
        <p className="muted">Probabilidad real de que un positivo esté infectado (Bayes)</p>
        <p className="big" style={{ color: "var(--red)" }}>{vpp.toFixed(1)}%</p>
        <p>
          De tus {r.n} pacientes, <b>{r.aisladosSanos}</b> sano(s) fueron aislados y <b>{r.liberadosInfectados}</b>{" "}
          infectado(s) quedaron libres.
        </p>
      </div>
      <div className="card">
        <h2>La ciudad entera</h2>
        <Ciudad />
        <p className="muted">
          Hay 270 positivos, pero solo 90 están infectados. La prueba acierta 90% con los infectados, pero eso no es lo
          mismo que “si da positivo, hay 90% de probabilidad de estar infectado”.
        </p>
        <p>
          P(infectado | +) = (0,9 × 0,1) / (0,9 × 0,1 + 0,2 × 0,9) = 0,09 / 0,27 ≈ <b>33,3%</b>
        </p>
      </div>
      <p className="muted">
        {estado === "guardando" && "Guardando tus respuestas…"}
        {estado === "ok" && "Respuestas guardadas ✔"}
        {estado === "error" && "No se pudieron guardar (revisá la conexión)."}
      </p>
      <div className="row">
        <button onClick={() => setFase("inicio")}>Jugar de nuevo</button>
        <Link className="btn sec" href="/panel">Ver panel del público</Link>
      </div>
    </main>
  );
}
