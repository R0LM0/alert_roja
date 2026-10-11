import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import type { PasosBayes } from "@/lib/formula-bayes";

function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-bold"
        aria-hidden="true"
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{titulo}</p>
        <p className="text-muted [overflow-wrap:anywhere]">{children}</p>
      </div>
    </li>
  );
}

export function FormulaBayes({ pasos }: { pasos: PasosBayes }) {
  const t = pasos.texto;
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>La fórmula de Bayes, paso a paso</CardTitle>
      <p className="rounded-lg bg-surface-2 p-3 font-semibold [overflow-wrap:anywhere]">
        P(E|+) = P(+|E)·P(E) / [P(+|E)·P(E) + P(+|S)·P(S)]
      </p>
      <ol className="flex flex-col gap-3">
        <Paso n={1} titulo="Los datos">
          Prevalencia {t.prevalencia}, sensibilidad {t.sensibilidad}, especificidad {t.especificidad}.
        </Paso>
        <Paso n={2} titulo="Infectados que dan positivo">{t.numerador}</Paso>
        <Paso n={3} titulo="Todos los positivos">
          {t.sumaDenominador} = {t.denominador}
        </Paso>
        <Paso n={4} titulo="Dividimos">
          {t.valores} = {t.resultado}
        </Paso>
      </ol>
      <p className="text-lg font-semibold">Un positivo está enfermo con probabilidad {t.resultado}.</p>
      <p className="text-muted">{t.frecuencias}</p>
    </Card>
  );
}
