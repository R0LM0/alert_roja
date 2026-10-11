import { ESPECIFICIDAD, N_CIUDAD, SENSIBILIDAD, frecuenciasNaturales, vppBayes } from "./stats";

/** Número con coma decimal y hasta `max` decimales (sin ceros sobrantes). */
export function formatearNumero(valor: number, max = 3): string {
  const s = valor.toFixed(max);
  const limpio = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return limpio.replace(".", ",");
}

/** Porcentaje con coma decimal, p. ej. "33,3 %". */
export function formatearPct(pct: number, decimales = 1): string {
  return `${pct.toFixed(decimales).replace(".", ",")} %`;
}

export type PasosBayes = {
  prevalencia: number;
  sensibilidad: number;
  especificidad: number;
  /** P(+|E)·P(E) */
  numerador: number;
  /** P(+|S)·P(S) */
  falsosPositivos: number;
  denominador: number;
  resultadoPct: number;
  /** Cadenas ya formateadas para mostrar (el componente no calcula). */
  texto: {
    prevalencia: string;
    sensibilidad: string;
    especificidad: string;
    numerador: string;
    sumaDenominador: string;
    valores: string;
    denominador: string;
    resultado: string;
    frecuencias: string;
  };
};

/** Pasos numéricos de P(E|+) = P(+|E)·P(E) / [P(+|E)·P(E) + P(+|S)·P(S)]. */
export function pasosBayes(prev: number, sens = SENSIBILIDAD, esp = ESPECIFICIDAD): PasosBayes {
  const numerador = sens * prev;
  const falsosPositivos = (1 - esp) * (1 - prev);
  const denominador = numerador + falsosPositivos;
  const resultadoPct = vppBayes(prev, sens, esp) * 100;
  const f = frecuenciasNaturales(N_CIUDAD, prev, sens, esp);
  const n = (v: number) => formatearNumero(v);
  return {
    prevalencia: prev,
    sensibilidad: sens,
    especificidad: esp,
    numerador,
    falsosPositivos,
    denominador,
    resultadoPct,
    texto: {
      prevalencia: n(prev),
      sensibilidad: n(sens),
      especificidad: n(esp),
      numerador: `${n(sens)} · ${n(prev)}`,
      sumaDenominador: `${n(sens)} · ${n(prev)} + ${n(1 - esp)} · ${n(1 - prev)}`,
      valores: `${n(numerador)} / (${n(numerador)} + ${n(falsosPositivos)})`,
      denominador: n(denominador),
      resultado: formatearPct(resultadoPct, resultadoPct < 10 ? 2 : 1),
      frecuencias: `De ${N_CIUDAD} personas: ${f.vp} + ${f.fp} dan positivo; solo ${f.vp} están enfermas`,
    },
  };
}
