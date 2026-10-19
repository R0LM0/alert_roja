"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Play } from "lucide-react";
import { ColeccionInsignias } from "@/components/insignias/ColeccionInsignias";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { medallasInsignias } from "@/lib/insignias";
import { normalizarApodo } from "@/lib/ranking";
import { apodoRecordado, apodosConInsignias, leerInsignias } from "@/lib/sesion-juego";

type Datos = { recordado: string; apodos: string[] };

/** La clave del historial va en minúsculas; si coincide con el apodo recordado, se muestra tal cual se escribió. */
function nombreVisible(clave: string, recordado: string): string {
  const limpio = recordado.trim();
  if (limpio && normalizarApodo(limpio) === clave) return limpio;
  return clave.charAt(0).toUpperCase() + clave.slice(1);
}

function SinInsignias() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-14 pb-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold">Mis insignias</h1>
      </header>
      <Card className="flex flex-col items-center gap-3 text-center">
        <Award aria-hidden="true" className="size-12 text-muted" />
        <CardTitle>Aún no tienes insignias</CardTitle>
        <p className="text-muted">Juega un turno: cada ronda puede darte medallas. Se guardan en este celular.</p>
        <Button asChild size="lg">
          <Link href="/">
            <Play aria-hidden="true" /> ¡Jugar ahora!
          </Link>
        </Button>
      </Card>
    </main>
  );
}

/** Colección de insignias del apodo recordado (o del que elija el jugador), guardada en este dispositivo. */
export function MisInsignias() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);

  useEffect(() => {
    setDatos({ recordado: apodoRecordado(), apodos: apodosConInsignias() });
  }, []);

  if (!datos) return null;
  const claveRecordada = normalizarApodo(datos.recordado);
  const apodo = elegido ?? (datos.apodos.includes(claveRecordada) ? claveRecordada : datos.apodos[0]);
  if (!apodo) return <SinInsignias />;

  const ganadas = leerInsignias(apodo);
  const fechas = Object.fromEntries(ganadas.map((i) => [i.id, i.fecha]));
  const medallas = medallasInsignias(ganadas.map((i) => i.id), fechas);
  const total = medallas.length;
  const cuantas = medallas.filter((m) => m.ganada).length;
  const nombre = nombreVisible(apodo, datos.recordado);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-14 pb-8">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-3xl font-bold">Mis insignias</h1>
        <p className="text-muted">de {nombre}</p>
        <p className="text-sm text-muted">Se guardan en este celular.</p>
      </header>

      {datos.apodos.length > 1 ? (
        <div role="group" aria-label="Elige un apodo" className="flex flex-wrap justify-center gap-2">
          {datos.apodos.map((clave) => (
            <Button
              key={clave}
              type="button"
              size="md"
              variant={clave === apodo ? "primary" : "outline"}
              className="rounded-full"
              aria-pressed={clave === apodo}
              onClick={() => setElegido(clave)}
            >
              {nombreVisible(clave, datos.recordado)}
            </Button>
          ))}
        </div>
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            {cuantas} de {total} insignias
          </p>
          <Progress
            value={(cuantas / total) * 100}
            aria-label={`${cuantas} de ${total} insignias`}
            indicatorClassName="motion-reduce:transition-none"
          />
        </div>
        <ColeccionInsignias medallas={medallas} animar={false} />
      </Card>

      <Button asChild size="lg">
        <Link href="/">
          <Play aria-hidden="true" /> ¡Jugar ahora!
        </Link>
      </Button>
    </main>
  );
}
