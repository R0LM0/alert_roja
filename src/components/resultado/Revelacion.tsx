"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { FaseCiudad } from "@/lib/ciudad-layout";
import { festejar } from "@/lib/confeti";
import { formatearPct, pasosBayes } from "@/lib/formula-bayes";
import { prevalenciaDeModo, type Modo } from "@/lib/ronda";
import { calcularResultado } from "@/lib/resultado";
import { leerResultado, limpiar, type ResultadoJuego } from "@/lib/sesion-juego";
import { useSonido } from "@/lib/sound";
import { AccionesResultado } from "./AccionesResultado";
import { Aparece } from "./Aparece";
import { CiudadSlot } from "./CiudadSlot";
import { ComparacionIntuicion } from "./ComparacionIntuicion";
import { FormulaBayes } from "./FormulaBayes";
import { Insignias } from "./Insignias";
import { MensajeClave } from "./MensajeClave";
import { PuntajeResumen } from "./PuntajeResumen";

/** Pausas de la secuencia: ver la ciudad mezclada, reagrupar y, al final, celebrar. */
const RETARDO_TABLA_MS = 2200;
const RETARDO_CIERRE_MS = 4600;

const pctEntero = (pct: number) => formatearPct(pct, 0);
const pctLegible = (pct: number) => formatearPct(pct, pct < 10 ? 1 : 0);

function SinResultado() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-14 pb-8">
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

  const esPuntajeAlto = calculo.esPuntajeAlto;
  const decisionesAcertadas = calculo.filas.filter((f) => f.decisionAcertada).length;
  const mayoriaAcertada = decisionesAcertadas * 2 >= calculo.filas.length;

  // Secuencia de la revelación: ciudad -> tabla -> cierre (sonido + confeti).
  // Aquí la verdad ya es conocida por el jugador, por eso suenan acierto/error.
  const [fase, setFase] = useState<FaseCiudad>("ciudad");
  const { play } = useSonido();
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);
  const cerrada = useRef(false); // StrictMode ejecuta el efecto dos veces
  useEffect(() => {
    const reducido =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const aTabla = setTimeout(() => setFase("tabla"), reducido ? 0 : RETARDO_TABLA_MS);
    const alCerrar = setTimeout(() => {
      if (cerrada.current) return;
      cerrada.current = true;
      playRef.current(mayoriaAcertada ? "acierto" : "error");
      if (esPuntajeAlto) festejar(); // no hace nada con movimiento reducido
    }, reducido ? 400 : RETARDO_CIERRE_MS);
    return () => {
      clearTimeout(aTabla);
      clearTimeout(alCerrar);
    };
  }, [esPuntajeAlto, mayoriaAcertada]);

  function jugar(destino: Modo) {
    limpiar();
    router.push(destino === "experto" ? "/jugar?modo=experto" : "/jugar");
  }

  return (
    <main data-puntaje-alto={esPuntajeAlto} className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-14 pb-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold">Turno terminado, {resultado.jugador}</h1>
        <p className="text-muted">{modo === "experto" ? "Modo experto · prevalencia 1 %" : "Modo normal · prevalencia 10 %"}</p>
      </header>
      <Aparece orden={0}>
        <CiudadSlot frecuencias={calculo.frecuencias} mensajeFrecuencias={pasos.texto.frecuencias} fase={fase} />
      </Aparece>
      {calculo.estimacionPromedioPct !== null ? (
        <Aparece orden={1}>
          <ComparacionIntuicion
            intuicionPct={calculo.estimacionPromedioPct}
            realidadPct={calculo.vppTeoricoPct}
            intuicionTexto={pctLegible(calculo.estimacionPromedioPct)}
            realidadTexto={pctLegible(calculo.vppTeoricoPct)}
          />
        </Aparece>
      ) : null}
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
