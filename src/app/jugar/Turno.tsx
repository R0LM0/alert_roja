"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Timer, TimerOff, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CuentaRegresiva } from "@/components/game/cuenta-regresiva";
import { ProgresoPacientes } from "@/components/game/progreso-pacientes";
import { TarjetaPaciente } from "@/components/game/TarjetaPaciente";
import { enviarPartida } from "@/lib/cola-offline";
import {
  armarPartida,
  crearRonda,
  prevalenciaDeModo,
  type Decision,
  type Modo,
  type PacienteRonda,
  type RespuestaUI,
} from "@/lib/ronda";
import { guardarResultado, leerApodo } from "@/lib/sesion-juego";

const SEGUNDOS_POR_PACIENTE = 15;
const PAUSA_TIEMPO_AGOTADO_MS = 1500;
const ESTIMACION_INICIAL = 50;

type Fase = "cargando" | "jugando" | "enviando" | "error";

function nuevaSemilla(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

/** Contenedor de la ronda: dueño del temporizador, de las respuestas y del envío final. */
export function Turno({ modo }: { modo: Modo }) {
  const router = useRouter();
  const prevalencia = prevalenciaDeModo(modo);

  const [fase, setFase] = useState<Fase>("cargando");
  const [apodo, setApodo] = useState("");
  const [ronda, setRonda] = useState<PacienteRonda[]>([]);
  const [indice, setIndice] = useState(0);
  const [estimacion, setEstimacion] = useState(ESTIMACION_INICIAL);
  const [conTiempo, setConTiempo] = useState(true);
  const [restantes, setRestantes] = useState(SEGUNDOS_POR_PACIENTE);
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  const respuestas = useRef<RespuestaUI[]>([]);
  const estimacionRef = useRef(ESTIMACION_INICIAL);
  const inicioPaciente = useRef(0);
  const ocupado = useRef(false); // evita doble decisión (botón + timeout + swipe)
  const iniciada = useRef(false);
  const enviada = useRef(false);
  const pausa = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const decidirActual = useRef<(d: Decision, porTiempo?: boolean) => void>(() => {});

  // La ronda se crea una sola vez, en el cliente (si no, SSR y cliente sortearían distinto).
  useEffect(() => {
    if (iniciada.current) return;
    iniciada.current = true;
    const nombre = leerApodo();
    if (!nombre) {
      router.replace("/");
      return;
    }
    setApodo(nombre);
    setRonda(crearRonda(nuevaSemilla(), prevalencia));
    setFase("jugando");
  }, [router, prevalencia]);

  useEffect(() => () => clearTimeout(pausa.current), []);

  // Cronómetro del tiempo de respuesta: arranca al mostrarse cada paciente.
  useEffect(() => {
    if (fase === "jugando") inicioPaciente.current = performance.now();
  }, [fase, indice]);

  function cambiarEstimacion(pct: number) {
    estimacionRef.current = pct;
    setEstimacion(pct);
  }

  function avanzar() {
    if (indice + 1 >= ronda.length) {
      void finalizar();
      return;
    }
    ocupado.current = false;
    setTiempoAgotado(false);
    cambiarEstimacion(ESTIMACION_INICIAL);
    setIndice(indice + 1);
  }

  /**
   * Si se agota el tiempo NO se decide por el jugador a ciegas: se envía la estimación actual
   * del termómetro y el paciente queda LIBERADO (no actuar = no aislar). Se muestra un aviso
   * ámbar 1,5 s y se pasa al siguiente. El tiempo registrado es el real (~15 s).
   */
  function decidir(decision: Decision, porTiempo = false) {
    if (fase !== "jugando" || ocupado.current) return;
    ocupado.current = true;
    respuestas.current = [
      ...respuestas.current,
      {
        paciente: ronda[indice],
        estimacion_pct: estimacionRef.current,
        decision,
        tiempo_ms: performance.now() - inicioPaciente.current,
      },
    ];
    if (porTiempo) {
      setTiempoAgotado(true);
      pausa.current = setTimeout(avanzar, PAUSA_TIEMPO_AGOTADO_MS);
    } else {
      avanzar();
    }
  }
  useEffect(() => {
    decidirActual.current = decidir;
  });

  // Cuenta regresiva con fecha límite (robusta si el navegador frena los timers).
  useEffect(() => {
    if (fase !== "jugando" || !conTiempo || tiempoAgotado) return;
    const fin = Date.now() + SEGUNDOS_POR_PACIENTE * 1000;
    setRestantes(SEGUNDOS_POR_PACIENTE);
    const id = setInterval(() => {
      const q = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setRestantes(q);
      if (q === 0) {
        clearInterval(id);
        decidirActual.current("liberar", true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [fase, conTiempo, tiempoAgotado, indice]);

  async function finalizar() {
    if (enviada.current) return;
    enviada.current = true;
    setFase("enviando");
    const payload = armarPartida(apodo, prevalencia, respuestas.current);
    const r = await enviarPartida(payload);
    if (r.estado === "rechazado") {
      setMensajeError(r.mensaje);
      setFase("error");
      return;
    }
    guardarResultado({
      jugador: payload.jugador,
      modo,
      ronda,
      respuestas: payload.respuestas,
      estado: r.estado,
      ...(r.estado === "guardado" ? { id: r.id, puntaje: r.puntaje } : {}),
    });
    router.push("/resultado");
  }

  if (fase === "cargando") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16">
        <p role="status" className="text-lg text-muted">
          Preparando tu turno…
        </p>
      </main>
    );
  }

  if (fase === "enviando" || fase === "error") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
        <Card className="flex flex-col items-center gap-4 text-center">
          {fase === "enviando" ? (
            <p role="status" className="flex items-center gap-3 font-display text-2xl font-semibold">
              <Loader2 aria-hidden="true" className="size-7 animate-spin" /> Enviando…
            </p>
          ) : (
            <>
              <p role="alert" className="flex items-center gap-2 font-semibold text-primary-text">
                <TriangleAlert aria-hidden="true" className="size-5" /> No se pudo guardar: {mensajeError}
              </p>
              <Button asChild variant="outline">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </>
          )}
        </Card>
      </main>
    );
  }

  const paciente = ronda[indice];
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
      <p className="sr-only" aria-live="polite">
        Paciente {indice + 1} de {ronda.length}
      </p>

      <div className="flex items-start gap-4">
        <ProgresoPacientes actual={indice + 1} total={ronda.length} className="grow" />
        {conTiempo ? <CuentaRegresiva segundos={SEGUNDOS_POR_PACIENTE} restantes={restantes} /> : null}
      </div>

      <div role="group" aria-label="Cuenta regresiva" className="flex gap-2">
        <Button
          size="md"
          variant={conTiempo ? "primary" : "outline"}
          aria-pressed={conTiempo}
          onClick={() => setConTiempo(true)}
        >
          <Timer aria-hidden="true" /> Con tiempo
        </Button>
        <Button
          size="md"
          variant={conTiempo ? "outline" : "primary"}
          aria-pressed={!conTiempo}
          onClick={() => setConTiempo(false)}
        >
          <TimerOff aria-hidden="true" /> Sin tiempo
        </Button>
      </div>

      {tiempoAgotado ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-warning px-4 py-3 font-semibold text-warning-foreground"
        >
          <TimerOff aria-hidden="true" className="size-5" />
          ¡Se acabó el tiempo! Se envió tu estimación y el paciente quedó liberado.
        </p>
      ) : null}

      <TarjetaPaciente
        key={paciente.orden}
        paciente={paciente}
        estimacion={estimacion}
        onEstimacion={cambiarEstimacion}
        onDecidir={decidir}
        disabled={tiempoAgotado}
      />
    </main>
  );
}
