"use client";

import { useState, type ReactNode } from "react";
import { Medal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { festejar } from "@/lib/confeti";
import { formatearHoraFeria, type Podio, type Puesto } from "@/lib/podio";
import { formatearTiempoTotal } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Posicion = 1 | 2 | 3;
type Props = { podio: Podio; cierre: string | null };

/** Orden de revelación: 3.º, luego 2.º y al final 1.º. */
const REVELACION: Posicion[] = [3, 2, 1];
const ALTURA: Record<Posicion, string> = {
  1: "min-h-[15rem] 2xl:min-h-[25rem]",
  2: "min-h-[11rem] 2xl:min-h-[18rem]",
  3: "min-h-[8rem] 2xl:min-h-[14rem]",
};
const COLOR_MEDALLA: Record<Posicion, string> = {
  1: "text-[#facc15]",
  2: "text-[#cbd5e1]",
  3: "text-[#d97706]",
};
const RANGO = { 1: "1.º", 2: "2.º", 3: "3.º" } as const;

/** Un escalón del podio: medalla, nombre, puntaje, tiempo y hora. Oculto hasta que se revela. */
function Escalon({ posicion, puesto, visible }: { posicion: Posicion; puesto?: Puesto; visible: boolean }) {
  const Icono = posicion === 1 ? Trophy : Medal;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-end overflow-hidden rounded-t-2xl border border-b-0 border-border-strong p-2 text-center sm:p-3 2xl:p-5",
        posicion === 1 ? "bg-primary/25" : "bg-surface",
        ALTURA[posicion],
      )}
    >
      <div
        aria-hidden={!visible}
        className={cn(
          "flex w-full flex-col items-center gap-1 motion-safe:transition-all motion-safe:duration-700",
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        <Icono aria-hidden="true" className={cn("size-10 sm:size-12 2xl:size-20", COLOR_MEDALLA[posicion])} />
        <span className="text-base font-bold text-muted 2xl:text-2xl">{RANGO[posicion]}</span>
        {puesto ? (
          <>
            <span className="w-full break-words font-display text-xl leading-tight font-bold sm:text-2xl 2xl:text-5xl">
              {puesto.jugador}
            </span>
            <span className="text-lg font-bold text-primary-text tabular-nums sm:text-2xl 2xl:text-4xl">
              {puesto.puntaje} pts
            </span>
            <span className="text-sm text-muted tabular-nums sm:text-base 2xl:text-2xl">
              Tiempo {formatearTiempoTotal(puesto.tiempoTotalMs)}
            </span>
            <span className="text-sm text-muted tabular-nums sm:text-base 2xl:text-2xl">
              Jugó {formatearHoraFeria(puesto.creada_en)}
            </span>
            {puesto.empate || puesto.mismoDispositivo ? (
              <span className="mt-1 flex flex-wrap justify-center gap-1">
                {puesto.empate ? <Etiqueta>Empate</Etiqueta> : null}
                {puesto.mismoDispositivo ? <Etiqueta>Mismo dispositivo</Etiqueta> : null}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-lg text-muted 2xl:text-2xl">Sin jugador</span>
        )}
      </div>
      {visible ? null : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-6xl font-bold text-border-strong 2xl:text-8xl">
          ?
        </span>
      )}
    </div>
  );
}

function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground 2xl:text-base">{children}</span>;
}

/** Un podio (un modo). Se muestra 2.º · 1.º · 3.º, con el 1.º más alto. */
function Columna({ titulo, porcentaje, puestos, paso }: { titulo: string; porcentaje: string; puestos: Puesto[]; paso: number }) {
  return (
    <section aria-label={`Podio ${titulo}`} className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4 sm:p-6 2xl:gap-6 2xl:p-8">
      <h2 className="font-display text-3xl font-bold sm:text-4xl 2xl:text-5xl">
        {titulo} <span className="text-xl font-semibold text-muted 2xl:text-3xl">· {porcentaje} de prevalencia</span>
      </h2>
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {([2, 1, 3] as const).map((pos) => (
          <Escalon
            key={pos}
            posicion={pos}
            puesto={puestos.find((p) => p.posicion === pos)}
            visible={paso >= REVELACION.length + 1 - pos}
          />
        ))}
      </div>
    </section>
  );
}

const REGLAS = "Cuenta el primer intento de cada apodo en cada modo. Desempate: menor tiempo total, luego quién jugó primero. Partidas después del cierre no cuentan.";

/** Podio de la feria: dos columnas (Normal y Experto) con revelación 3.º → 2.º → 1.º. */
export function PodioFeria({ podio, cierre }: Props) {
  const [paso, setPaso] = useState(0);
  const hayPuestos = podio.normal.length + podio.experto.length > 0;
  const terminado = paso >= REVELACION.length;
  const proximo = REVELACION[paso];

  function revelar() {
    const nuevo = paso + 1;
    setPaso(nuevo);
    if (nuevo === REVELACION.length) festejar();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[120rem] flex-col gap-4 p-4 sm:p-6 2xl:gap-6 2xl:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl leading-tight font-bold sm:text-5xl 2xl:text-6xl">
          <span className="text-primary-text">Alerta Roja</span> · Podio
        </h1>
        {hayPuestos ? (
          <Button size="lg" className="w-full text-xl sm:w-auto 2xl:text-3xl" onClick={revelar} disabled={terminado}>
            {terminado ? "Podio revelado" : `Revelar ${RANGO[proximo]}`}
          </Button>
        ) : null}
      </header>

      {hayPuestos ? null : (
        <p className="text-xl text-muted 2xl:text-3xl">Todavía no hay partidas para el podio.</p>
      )}

      <p className="sr-only" aria-live="polite">
        {paso > 0 ? `Revelado el ${RANGO[REVELACION[paso - 1]]} puesto` : ""}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:gap-8">
        <Columna titulo="Normal" porcentaje="10 %" puestos={podio.normal} paso={paso} />
        <Columna titulo="Experto" porcentaje="1 %" puestos={podio.experto} paso={paso} />
      </div>

      {podio.hayEmpate ? (
        <p role="note" className="rounded-xl border border-warning p-3 text-lg font-semibold text-warning 2xl:text-2xl">
          Hay empate: mismo puntaje y tiempo. Se muestra el orden de llegada; decidí antes de premiar.
        </p>
      ) : null}
      {podio.hayMismoDispositivo ? (
        <p role="note" className="rounded-xl border border-warning p-3 text-lg font-semibold text-warning 2xl:text-2xl">
          Un mismo dispositivo ocupa más de un puesto. El sistema no excluye a nadie: decidí antes de premiar.
        </p>
      ) : null}

      <footer className="mt-auto flex flex-col gap-2 text-base text-muted sm:text-lg 2xl:text-xl">
        <p>{REGLAS}</p>
        <p>
          {cierre
            ? `Cierre de la feria: ${formatearHoraFeria(cierre)} (hora de Managua).`
            : "Sin hora de cierre definida (CIERRE_FERIA): cuentan todas las partidas."}
        </p>
      </footer>
    </main>
  );
}
