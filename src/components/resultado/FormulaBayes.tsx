import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { texBayes, type PasosBayes } from "@/lib/formula-bayes";
import { Formula } from "./Formula";
import { FrecuenciasBarra } from "./FrecuenciasBarra";

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
  const tex = texBayes(pasos.prevalencia, pasos.sensibilidad, pasos.especificidad);
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>La fórmula de Bayes, paso a paso</CardTitle>
      <div className="flex flex-col gap-1 rounded-lg bg-surface-2 p-3">
        <Formula
          tex={tex.simbolica}
          ariaLabel="P de enfermo dado positivo es igual a P de positivo dado enfermo por P de enfermo, dividido entre ese mismo producto más P de positivo dado sano por P de sano"
        />
        <Formula
          tex={tex.sustitucion}
          ariaLabel={`Con los datos: ${t.numerador} dividido entre ${t.sumaDenominador}`}
        />
        <Formula tex={tex.resultado} ariaLabel={`${t.valores} = ${t.resultado}`} />
      </div>
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
      <FrecuenciasBarra pasos={pasos} />
    </Card>
  );
}
