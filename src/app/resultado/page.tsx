"use client";

// Marcador de posición: la fase 4 reemplaza esta página por el reveal completo.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GuardadoEstado } from "@/components/game/guardado-estado";
import { prevalenciaDeModo } from "@/lib/ronda";
import { leerResultado, type ResultadoJuego } from "@/lib/sesion-juego";
import { puntajePartida } from "@/lib/stats";

export default function PaginaResultado() {
  const [resultado, setResultado] = useState<ResultadoJuego | null | undefined>(undefined);

  useEffect(() => {
    setResultado(leerResultado());
  }, []);

  if (resultado === undefined) return null;

  if (resultado === null) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
        <Card className="flex flex-col gap-3">
          <CardTitle>Aún no hay resultado</CardTitle>
          <p className="text-muted">Juega un turno para ver tu puntaje.</p>
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const puntaje = resultado.puntaje ?? puntajePartida(resultado.respuestas, prevalenciaDeModo(resultado.modo));
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <Card className="flex flex-col items-center gap-3 text-center">
        <CardTitle>Turno terminado, {resultado.jugador}</CardTitle>
        <p className="font-display text-6xl font-bold tabular-nums">{puntaje}</p>
        <p className="text-muted">puntos</p>
        <GuardadoEstado guardado={resultado.estado === "guardado"} />
        <Button asChild variant="outline">
          <Link href="/">Jugar de nuevo</Link>
        </Button>
      </Card>
    </main>
  );
}
