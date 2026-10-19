"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, Timer, TimerOff, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DURACION_SALIDA_MS } from "@/lib/paciente3d";
import { Card } from "@/components/ui/card";
// Escena 3D en primera persona (carga solo en el cliente, sin SSR); si falta
// WebGL el propio componente vuelve al flujo 2D (fallback S10).
const Consultorio3D = dynamic(() => import("@/components/game/consultorio3d/Consultorio3D"), {
  ssr: false,
});
import { CuentaRegresiva } from "@/components/game/cuenta-regresiva";
import { ProgresoPacientes } from "@/components/game/progreso-pacientes";
import { TarjetaPaciente } from "@/components/game/TarjetaPaciente";
import { duenoLocal } from "@/lib/apodos";
import { enviarPartida } from "@/lib/cola-offline";
import {
  armarPartida,
  crearRonda,
  nuevoIdPartida,
  prevalenciaDeModo,
  type Decision,
  type Modo,
  type PacienteRonda,
  type RespuestaUI,
} from "@/lib/ronda";
import { guardarResultado, leerApodo } from "@/lib/sesion-juego";

const SEGUNDOS_POR_PACIENTE = 15;

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
  const [conTiempo, setConTiempo] = useState(true);
  const [restantes, setRestantes] = useState(SEGUNDOS_POR_PACIENTE);
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [escenaLista, setEscenaLista] = useState(false);
  // El paciente de la ronda entra caminando: la tarjeta y el cronómetro esperan
  // a que llegue a su silla (S7). Al decidir, sale caminando antes del siguiente.
  const [llegoPaciente, setLlegoPaciente] = useState(false);
  const [saliendoPaciente, setSaliendoPaciente] = useState(false);
  const [salidaPaciente, setSalidaPaciente] = useState<"cuarentena" | "puerta" | null>(null);
  const movimientoReducido = useReducedMotion() ?? false;

  const respuestas = useRef<RespuestaUI[]>([]);
  const inicioPaciente = useRef(0);
  const ocupado = useRef(false); // evita doble decisión (botón + timeout + swipe)
  const idPartida = useRef("");
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
    idPartida.current = nuevoIdPartida(); // clave de idempotencia de esta ronda
    setRonda(crearRonda(nuevaSemilla(), prevalencia));
    // La escena se monta también en "cargando" y reabre la puerta al entrar
    // a "jugando": la tarjeta espera a la puerta de esta fase (S3).
    setEscenaLista(false);
    setFase("jugando");
  }, [router, prevalencia]);

  // La primera tarjeta aparece cuando la puerta terminó de abrirse (S3): el
  // canvas avisa con `alListo` y se deja un respiro de 600 ms para ver
  // la puerta abierta. Con movimiento reducido no se espera. El respaldo de
  // 15 s es solo un cortafuegos: el aviso normal llega en ~2 s (el respaldo
  // por carga lenta vive en el propio canvas, medido desde su montaje).
  const puerta = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alEstarListo = useCallback(() => {
    clearTimeout(puerta.current);
    puerta.current = setTimeout(() => setEscenaLista(true), 600);
  }, []);
  useEffect(() => {
    if (fase !== "jugando") return;
    if (movimientoReducido) {
      setEscenaLista(true);
      return;
    }
    const id = setTimeout(() => setEscenaLista(true), 15000);
    return () => clearTimeout(id);
  }, [fase, movimientoReducido]);

  useEffect(() => () => {
    clearTimeout(pausa.current);
    clearTimeout(puerta.current);
  }, []);

  // Cronómetro del tiempo de respuesta: arranca cuando el paciente llega a su silla.
  useEffect(() => {
    if (fase === "jugando" && escenaLista && llegoPaciente) inicioPaciente.current = performance.now();
  }, [fase, escenaLista, llegoPaciente, indice]);

  function avanzar() {
    if (indice + 1 >= ronda.length) {
      void finalizar();
      return;
    }
    ocupado.current = false;
    setTiempoAgotado(false);
    setLlegoPaciente(false);
    setSaliendoPaciente(false);
    setSalidaPaciente(null);
    setIndice(indice + 1);
  }

  /**
   * Si se agota el tiempo el paciente queda LIBERADO (no actuar = no aislar). Se muestra un aviso
   * ámbar mientras el paciente sale caminando y se pasa al siguiente. El tiempo registrado
   * es el real (~15 s).
   */
  function decidir(decision: Decision, porTiempo = false) {
    if (fase !== "jugando" || ocupado.current) return;
    ocupado.current = true;
    respuestas.current = [
      ...respuestas.current,
      {
        paciente: ronda[indice],
        estimacion_pct: null,
        decision,
        tiempo_ms: performance.now() - inicioPaciente.current,
      },
    ];
    // El paciente sale caminando (~2 s) y recién entonces entra el siguiente.
    setSalidaPaciente(decision === "aislar" ? "cuarentena" : "puerta");
    setSaliendoPaciente(true);
    if (porTiempo) {
      setTiempoAgotado(true);
      pausa.current = setTimeout(avanzar, DURACION_SALIDA_MS);
    } else {
      pausa.current = setTimeout(avanzar, DURACION_SALIDA_MS);
    }
  }
  useEffect(() => {
    decidirActual.current = decidir;
  });

  // Cuenta regresiva con fecha límite (robusta si el navegador frena los timers).
  useEffect(() => {
    if (fase !== "jugando" || !conTiempo || tiempoAgotado || !escenaLista || !llegoPaciente) return;
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
  }, [fase, conTiempo, tiempoAgotado, escenaLista, llegoPaciente, indice]);

  async function finalizar() {
    if (enviada.current) return;
    enviada.current = true;
    setFase("enviando");
    const payload = armarPartida(apodo, prevalencia, respuestas.current, duenoLocal(), idPartida.current);
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
      <motion.main
        className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16"
        initial={movimientoReducido ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Fundido de entrada tras el velo negro + misma posición que en jugando. */}
        <Consultorio3D alListo={alEstarListo} salidaPaciente={null} />
        <p
          role="status"
          className="relative z-10 rounded-full bg-surface/90 px-4 py-2 text-lg text-muted shadow-soft"
        >
          Preparando tu turno…
        </p>
      </motion.main>
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
    <motion.main
      className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-3 pb-4"
      initial={movimientoReducido ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* Escena 3D detrás del juego: misma posición que en cargando para no rearmarla.
          La tarjeta trae fondo sólido y la escena queda legible alrededor. */}
      <Consultorio3D
        alListo={alEstarListo}
        semillaPaciente={paciente.seed}
        nombrePaciente={paciente.nombre}
        saliendoPaciente={saliendoPaciente}
        salidaPaciente={salidaPaciente}
        alLlegarPaciente={() => setLlegoPaciente(true)}
      />
      <p className="sr-only" aria-live="polite">
        Paciente {indice + 1} de {ronda.length}
      </p>

      {!escenaLista || !llegoPaciente ? (
        <p
          role="status"
          className="relative z-10 mx-auto mt-24 rounded-full bg-surface/90 px-4 py-2 text-lg text-muted shadow-soft"
        >
          {!escenaLista ? "Entrando al consultorio…" : "El paciente se acerca…"}
        </p>
      ) : (
        <>

      <div className="flex items-start gap-4 pr-12">
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
          ¡Se acabó el tiempo! El paciente quedó liberado.
        </p>
      ) : null}

      <TarjetaPaciente
        key={paciente.orden}
        paciente={paciente}
        evidencia={paciente.evidencia}
        onDecidir={decidir}
        disabled={tiempoAgotado}
      />
        </>
      )}
    </motion.main>
  );
}
