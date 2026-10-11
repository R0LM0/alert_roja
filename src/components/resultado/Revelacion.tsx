"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { formatearPct, pasosBayes } from "@/lib/formula-bayes";
import { prevalenciaDeModo, type Modo } from "@/lib/ronda";
import { calcularResultado } from "@/lib/resultado";
import { leerResultado, limpiar, type ResultadoJuego } from "@/lib/sesion-juego";
import { AccionesResultado } from "./AccionesResultado";
import { Aparece } from "./Aparece";
import { CiudadSlot } from "./CiudadSlot";
import { ComparacionIntuicion } from "./ComparacionIntuicion";
import { FormulaBayes } from "./FormulaBayes";
import { Insignias } from "./Insignias";
import { MensajeClave } from "./MensajeClave";
import { PuntajeResumen } from "./PuntajeResumen";

const pctEntero = (pct: number) => formatearPct(pct, 0);
const pctLegible = (pct: number) => formatearPct(pct, pct < 10 ? 1 : 0);

function SinResultado() {
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

function Pantalla({ resultado }: { resultado: ResultadoJuego }) {
  const router = useRouter();
  const { modo } = resultado;
  const calculo = useMemo(
    () =>
      calcularResultado({
        modo,
        ronda: resultado.ronda,
        respuestas: resultado.respuestas,
        puntajeServidor: resultado.puntaje,
      }),
    [modo, resultado],
  );
  const pasos = useMemo(() => pasosBayes(prevalenciaDeModo(modo)), [modo]);

  // phase 6: festejar() (confeti) cuando esPuntajeAlto sea true
  const esPuntajeAlto = calculo.esPuntajeAlto;

  function jugar(destino: Modo) {
    limpiar();
    router.push(destino === "experto" ? "/jugar?modo=experto" : "/jugar");
  }

  return (
    <main data-puntaje-alto={esPuntajeAlto} className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold">Turno terminado, {resultado.jugador}</h1>
        <p className="text-muted">{modo === "experto" ? "Modo experto · prevalencia 1 %" : "Modo normal · prevalencia 10 %"}</p>
      </header>
      <Aparece orden={0}>
        <CiudadSlot frecuencias={calculo.frecuencias} mensajeFrecuencias={pasos.texto.frecuencias} />
      </Aparece>
      <Aparece orden={1}>
        <ComparacionIntuicion
          intuicionPct={calculo.estimacionPromedioPct}
          realidadPct={calculo.vppTeoricoPct}
          intuicionTexto={pctLegible(calculo.estimacionPromedioPct)}
          realidadTexto={pctLegible(calculo.vppTeoricoPct)}
        />
      </Aparece>
      <Aparece orden={2}>
        <PuntajeResumen
          total={calculo.puntajeTotal}
          infectadosEnRonda={calculo.infectadosEnRonda}
          filas={calculo.filas}
          estimacionTexto={pctEntero}
        />
      </Aparece>
      <Aparece orden={3}>
        <Insignias insignias={calculo.insignias} />
      </Aparece>
      <Aparece orden={4}>
        <MensajeClave mensaje={calculo.mensajeClave} />
      </Aparece>
      <Aparece orden={5}>
        <FormulaBayes pasos={pasos} />
      </Aparece>
      <Aparece orden={6}>
        <AccionesResultado
          modo={modo}
          guardado={resultado.estado === "guardado"}
          onJugarDeNuevo={() => jugar(modo)}
          onCambiarModo={() => jugar(modo === "experto" ? "normal" : "experto")}
        />
      </Aparece>
    </main>
  );
}

/** Contenedor de /resultado: lee el resultado de la sesión y compone la revelación. */
export function Revelacion() {
  const [resultado, setResultado] = useState<ResultadoJuego | null | undefined>(undefined);

  useEffect(() => {
    setResultado(leerResultado());
  }, []);

  if (resultado === undefined) return null;
  if (resultado === null) return <SinResultado />;
  return <Pantalla resultado={resultado} />;
}
