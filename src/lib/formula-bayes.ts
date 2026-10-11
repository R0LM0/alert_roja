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
  /** Frecuencias naturales sobre N_CIUDAD. */
  conteos: { vp: number; fp: number; fn: number; vn: number };
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
    conteos: { vp: f.vp, fp: f.fp, fn: f.fn, vn: f.vn },
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

export type TexBayes = {
  /** Fórmula simbólica en forma de fracción. */
  simbolica: string;
  /** Misma fracción con los números del modo. */
  sustitucion: string;
  /** Fracción final y resultado. */
  resultado: string;
};

/** Número para TeX: la coma decimal va entre llaves para evitar el espacio de puntuación. */
const tex = (v: number) => formatearNumero(v).replace(",", "{,}");

/**
 * Cadenas TeX de la fórmula de Bayes (solo constantes y números, nunca texto del usuario).
 * Las clases `tex-num` / `tex-den` se colorean con tokens desde globals.css.
 */
export function texBayes(prev: number, sens = SENSIBILIDAD, esp = ESPECIFICIDAD): TexBayes {
  const p = pasosBayes(prev, sens, esp);
  const num = (c: string) => `\\htmlClass{tex-num}{${c}}`;
  const den = (c: string) => `\\htmlClass{tex-den}{${c}}`;
  const pct = p.resultadoPct.toFixed(p.resultadoPct < 10 ? 2 : 1).replace(".", "{,}");
  const sym = "P(+\\mid E)\\,P(E)";
  const sano = "P(+\\mid S)\\,P(S)";
  const aportes = `${tex(sens)} \\cdot ${tex(prev)}`;
  const falsos = `${tex(1 - esp)} \\cdot ${tex(1 - prev)}`;
  return {
    simbolica: `P(E\\mid +) = \\dfrac{${num(sym)}}{${den(`${sym} + ${sano}`)}}`,
    sustitucion: `P(E\\mid +) = \\dfrac{${num(aportes)}}{${den(`${aportes} + ${falsos}`)}}`,
    resultado: `\\dfrac{${tex(p.numerador)}}{${tex(p.denominador)}} = ${pct}\\,\\%`,
  };
}
