"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Loader2, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duenoLocal, reservarApodo } from "@/lib/apodos";
import type { Modo } from "@/lib/ronda";
import { APODO_MAX, apodoRecordado, guardarApodo, recordarApodo, validarApodo } from "@/lib/sesion-juego";

/** Apodo + botón de empezar. Valida, reserva el apodo en el servidor y navega a /jugar. */
export function CampoApodo() {
  const router = useRouter();
  const [apodo, setApodo] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saliendo, setSaliendo] = useState(false);
  const reducido = useReducedMotion() ?? false;
  const salida = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(salida.current), []);

  // Precarga el chunk 3D mientras el jugador escribe el apodo: al dar Start
  // la escena ya está en caché y no se esperan ~3 s de red (S10). Sin nuevas deps.
  useEffect(() => {
    void import("@/components/game/consultorio3d/Consultorio3D");
  }, []);
  const [verificando, setVerificando] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);

  useEffect(() => {
    setApodo(apodoRecordado());
  }, []);

  async function empezar(modo: Modo) {
    if (verificando) return;
    const problema = validarApodo(apodo);
    if (problema) {
      setError(problema);
      return;
    }
    const limpio = apodo.trim();
    setVerificando(true);
    setSugerencias([]);
    const reserva = await reservarApodo(limpio, duenoLocal());
    if (reserva.estado === "ocupado") {
      setError(reserva.mensaje);
      setSugerencias(reserva.sugerencias);
      setVerificando(false);
      return;
    }
    if (reserva.estado === "rechazado") {
      setError(reserva.mensaje);
      setVerificando(false);
      return;
    }
    // Libre o sin conexión: se sigue; el servidor de la partida valida de nuevo.
    guardarApodo(limpio);
    recordarApodo(limpio);
    const destino = modo === "experto" ? "/jugar?modo=experto" : "/jugar";
    // Velo de salida: funde a negro antes de navegar para una transición suave.
    if (saliendo) return;
    if (reducido) {
      router.push(destino);
      return;
    }
    setSaliendo(true);
    salida.current = setTimeout(() => router.push(destino), 280);
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void empezar("normal");
      }}
    >
      {/* El error del Input usa role="alert": se anuncia solo (región viva). */}
      <Input
        id="apodo"
        label="Tu apodo"
        hint={`De 1 a ${APODO_MAX} caracteres`}
        placeholder="Ej. Dra. Lucía"
        autoComplete="nickname"
        maxLength={APODO_MAX}
        value={apodo}
        error={error}
        onChange={(e) => {
          setApodo(e.target.value);
          setError(undefined);
          setSugerencias([]);
        }}
      />
      {sugerencias.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Apodos libres sugeridos">
          <span className="w-full text-sm text-muted">Prueba con:</span>
          {sugerencias.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="md"
              className="rounded-full"
              onClick={() => {
                setApodo(s);
                setError(undefined);
                setSugerencias([]);
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      ) : null}
      <Button type="submit" size="xl" className="w-full" disabled={verificando}>
        {verificando ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" /> Verificando apodo…
          </>
        ) : (
          "¡Empezar turno!"
        )}
      </Button>
      {saliendo ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-auto fixed inset-0 z-50 bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="self-center"
        disabled={verificando}
        onClick={() => void empezar("experto")}
      >
        <Microscope aria-hidden="true" /> Modo experto (enfermedad más rara)
      </Button>
    </form>
  );
}
