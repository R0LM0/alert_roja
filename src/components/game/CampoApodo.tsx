"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Modo } from "@/lib/ronda";
import { APODO_MAX, apodoRecordado, guardarApodo, recordarApodo, validarApodo } from "@/lib/sesion-juego";

/** Apodo + botón de empezar. Valida con el mismo filtro que el servidor y navega a /jugar. */
export function CampoApodo() {
  const router = useRouter();
  const [apodo, setApodo] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saliendo, setSaliendo] = useState(false);
  const reducido = useReducedMotion() ?? false;
  const salida = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(salida.current), []);

  useEffect(() => {
    setApodo(apodoRecordado());
  }, []);

  function empezar(modo: Modo) {
    const problema = validarApodo(apodo);
    if (problema) {
      setError(problema);
      return;
    }
    const limpio = apodo.trim();
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
        empezar("normal");
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
        }}
      />
      <Button type="submit" size="xl" className="w-full">
        ¡Empezar turno!
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
      <Button type="button" variant="ghost" className="self-center" onClick={() => empezar("experto")}>
        <Microscope aria-hidden="true" /> Modo experto (enfermedad más rara)
      </Button>
    </form>
  );
}
