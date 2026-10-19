"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formatoNumero, type EvidenciaPanel } from "@/lib/panel";

type Props = {
  porEvidencia: EvidenciaPanel[] | undefined;
  /** Pacientes jugados en la temporada (con primer intento). */
  n: number;
  /** Muestra la decisión óptima de cada evidencia; oculta, deja un marcador "?". */
  revelar: boolean;
};

const COLOR_TEXTO = "var(--foreground)";
const COLOR_MUTED = "var(--muted)";
const COLOR_PUBLICO = "var(--info)";
const COLOR_OPTIMA = "var(--warning)";
/** Por debajo de este ancho (px) las etiquetas del eje son más cortas y chicas. */
const ANCHO_COMPACTO = 640;

/** Fila del gráfico. `optimaPct` solo existe para mostrar la barra revelada (100 = aislar, 0 = liberar). */
type FilaGrafico = {
  etiqueta: string;
  casos: number;
  aislaronPct: number | null;
  optima: "aislar" | "liberar";
  optimaPct: number;
  fantasma: number;
};

function etiquetaEje(fila: FilaGrafico | undefined, compacto: boolean): string {
  if (!fila) return "";
  if (fila.casos === 0) return compacto ? `${fila.etiqueta} (0)` : `${fila.etiqueta} · sin casos`;
  return compacto ? `${fila.etiqueta} (${fila.casos})` : `${fila.etiqueta} · ${fila.casos} casos`;
}

/**
 * "¿Qué decidió el público?": por tipo de evidencia, % que aisló frente a la decisión óptima.
 * Las evidencias van de menor a mayor probabilidad posterior. La óptima solo se ve con `revelar`.
 */
export function GraficoDecisiones({ porEvidencia, n, revelar }: Props) {
  const reducido = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const compacto = ancho > 0 && ancho < ANCHO_COMPACTO;
  const filas = useMemo<FilaGrafico[]>(
    () =>
      (porEvidencia ?? []).map((e) => ({
        etiqueta: e.etiqueta,
        casos: e.casos,
        aislaronPct: e.aislaronPct,
        optima: e.optima,
        optimaPct: e.optima === "aislar" ? 100 : 0,
        fantasma: 100,
      })),
    [porEvidencia],
  );
  const vacio = n === 0 || filas.every((f) => f.casos === 0);

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold sm:text-3xl">¿Qué decidió el público?</h2>
      <p className="text-sm text-muted sm:text-lg 2xl:hidden">Pacientes que dieron positivo, de menor a mayor probabilidad de infección.</p>

      {vacio ? (
        <div
          data-testid="decisiones-vacio"
          role="status"
          className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center sm:min-h-64"
        >
          <BarChart3 aria-hidden="true" className="size-10 text-muted" />
          <p className="text-lg font-semibold text-muted 2xl:text-2xl">Aún no hay decisiones. ¡Escanea el QR y juega!</p>
        </div>
      ) : (
        <>
          <ul aria-label="Leyenda" className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium sm:text-lg">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 rounded-sm" style={{ background: COLOR_PUBLICO }} />
              Aisló el público
            </li>
            <li className="flex items-center gap-2">
              {revelar ? (
                <span aria-hidden="true" className="size-3.5 rounded-sm" style={{ background: COLOR_OPTIMA }} />
              ) : (
                <span aria-hidden="true" className="size-3.5 rounded-sm border-2 border-dashed border-muted" />
              )}
              {revelar ? "Decisión óptima" : "Decisión óptima: ?"}
            </li>
          </ul>

          <div
            data-testid="decisiones-grafico"
            role="img"
            aria-label={`Barras: porcentaje de pacientes aislados por evidencia. ${revelar ? "Con la decisión óptima marcada." : "La decisión óptima está oculta."}`}
            className="relative min-h-40 flex-1"
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={160} onResize={(w) => setAncho(w)}>
              <BarChart
                layout="vertical"
                data={filas}
                margin={compacto ? { top: 4, right: 56, bottom: 4, left: 0 } : { top: 4, right: 96, bottom: 4, left: 0 }}
                barCategoryGap={compacto ? "16%" : "22%"}
                barGap={compacto ? 2 : 4}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(v: number) => `${v} %`}
                  tick={{ fill: COLOR_MUTED, fontSize: compacto ? 12 : 16 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="etiqueta"
                  width={compacto ? 150 : 300}
                  interval={0}
                  tickFormatter={(_: string, i: number) => etiquetaEje(filas[i], compacto)}
                  tick={{ fill: COLOR_TEXTO, fontSize: compacto ? 13 : 20 }}
                  tickLine={false}
                  axisLine={{ stroke: COLOR_MUTED }}
                />
                <Bar
                  dataKey="aislaronPct"
                  name="Aisló el público"
                  fill={COLOR_PUBLICO}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={!reducido}
                  animationDuration={900}
                >
                  <LabelList
                    dataKey="aislaronPct"
                    position="right"
                    formatter={(v: unknown) => `${formatoNumero(Number(v), 0)} %`}
                    fill={COLOR_TEXTO}
                    fontSize={compacto ? 13 : 20}
                    fontWeight={700}
                  />
                </Bar>
                {revelar ? (
                  <Bar
                    dataKey="optimaPct"
                    name="Decisión óptima"
                    fill={COLOR_OPTIMA}
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={!reducido}
                    animationBegin={700}
                    animationDuration={700}
                  >
                    <LabelList
                      dataKey="optima"
                      position="right"
                      formatter={(v: unknown) => (v === "aislar" ? "Aislar" : "Liberar")}
                      fill={COLOR_OPTIMA}
                      fontSize={compacto ? 13 : 20}
                      fontWeight={700}
                    />
                  </Bar>
                ) : (
                  // Marcador sin dato: barra completa punteada con "?"; no depende de las respuestas.
                  <Bar dataKey="fantasma" name="Decisión óptima oculta" fill="none" stroke={COLOR_MUTED} strokeDasharray="6 5" strokeWidth={2} isAnimationActive={false}>
                    <LabelList dataKey="fantasma" position="right" formatter={() => "?"} fill={COLOR_MUTED} fontSize={compacto ? 13 : 20} fontWeight={700} />
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Los datos del gráfico también van en una tabla oculta a la vista (lectores de pantalla). */}
      <div className="sr-only">
        <table>
          <caption>Decisiones del público por tipo de evidencia</caption>
          <thead>
            <tr>
              <th scope="col">Evidencia</th>
              <th scope="col">Casos</th>
              <th scope="col">Aisló (%)</th>
              {revelar ? <th scope="col">Decisión óptima</th> : null}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.etiqueta}>
                <th scope="row">{f.etiqueta}</th>
                <td>{f.casos}</td>
                <td>{f.aislaronPct === null ? "sin casos" : formatoNumero(f.aislaronPct, 0)}</td>
                {revelar ? <td>{f.optima}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
