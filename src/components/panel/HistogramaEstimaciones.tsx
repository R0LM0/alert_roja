"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { anclajeEtiquetaVpp, datosHistograma, formatoPct, posicionLineaVpp, type CubetaApi } from "@/lib/panel";

type Props = {
  histograma: CubetaApi[] | undefined;
  vppTeoricoPct: number | undefined;
  totalRespuestas: number;
};

const COLOR_TEXTO = "var(--foreground)";
const COLOR_MUTED = "var(--muted)";
const COLOR_BARRA = "var(--info)";
const COLOR_VPP = "var(--warning)";
const ID_PATRON = "panel-patron-barras";
const EJE_LINEA = "linea-vpp";
/** Por debajo de este ancho (px) el gráfico usa letras chicas y etiquetas cortas ("0", "10"…). */
const ANCHO_COMPACTO = 640;
/** Entre ANCHO_COMPACTO y este ancho: etiquetas completas pero de tamaño medio. */
const ANCHO_MEDIO = 860;

/** Histograma de las estimaciones del público con una línea vertical en el VPP teórico. */
export function HistogramaEstimaciones({ histograma, vppTeoricoPct, totalRespuestas }: Props) {
  const reducido = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const compacto = ancho > 0 && ancho < ANCHO_COMPACTO;
  const medio = !compacto && ancho > 0 && ancho < ANCHO_MEDIO;
  const filas = useMemo(() => (histograma ? datosHistograma(histograma) : []), [histograma]);
  const linea = vppTeoricoPct === undefined ? undefined : posicionLineaVpp(vppTeoricoPct).posicion;
  const etiquetaLinea = vppTeoricoPct === undefined ? "" : `VPP teórico ${formatoPct(vppTeoricoPct)}`;
  const vacio = filas.length === 0 || totalRespuestas === 0;

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold sm:text-3xl">¿Qué estimó el público?</h2>
      {vacio ? (
        <div
          data-testid="histograma-vacio"
          role="status"
          className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center sm:min-h-64"
        >
          <BarChart3 aria-hidden="true" className="size-10 text-muted" />
          <p className="text-lg font-semibold text-muted 2xl:text-2xl">Aún no hay respuestas. ¡Escanea el QR y juega!</p>
        </div>
      ) : (
        <div
          data-testid="histograma-grafico"
          role="img"
          aria-label={`Histograma de estimaciones. ${etiquetaLinea}.`}
          className="relative h-64 min-h-0 flex-1 sm:h-80"
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={240} onResize={(w) => setAncho(w)}>
            <BarChart
              data={filas}
              margin={compacto ? { top: 30, right: 8, bottom: 0, left: 0 } : { top: 44, right: 24, bottom: 4, left: 0 }}
              barCategoryGap={compacto ? "8%" : "12%"}
            >
              <defs>
                <pattern id={ID_PATRON} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="10" height="10" fill={COLOR_BARRA} />
                  <rect width="4" height="10" fill="rgb(0 0 0 / 0.35)" />
                </pattern>
              </defs>
              <XAxis
                dataKey="etiqueta"
                tick={{ fill: COLOR_TEXTO, fontSize: compacto ? 12 : medio ? 16 : 20 }}
                tickFormatter={(v: string, i: number) => (compacto ? String(filas[i]?.desde ?? v) : v)}
                tickLine={false}
                axisLine={{ stroke: COLOR_MUTED }}
                interval={0}
              />
              <XAxis xAxisId={EJE_LINEA} type="number" domain={[0, 10]} hide />
              <YAxis
                allowDecimals={false}
                width={compacto ? 28 : 48}
                tick={{ fill: COLOR_MUTED, fontSize: compacto ? 12 : medio ? 15 : 18 }}
                tickLine={false}
                axisLine={false}
                domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.15))]}
              />
              <Bar dataKey="cantidad" fill={`url(#${ID_PATRON})`} stroke={COLOR_BARRA} strokeWidth={compacto ? 1.5 : 2} radius={[6, 6, 0, 0]} isAnimationActive={!reducido}>
                <LabelList dataKey="cantidad" position="top" fill={COLOR_TEXTO} fontSize={compacto ? 13 : medio ? 18 : 22} fontWeight={700} />
              </Bar>
              {linea !== undefined ? (
                <ReferenceLine
                  xAxisId={EJE_LINEA}
                  x={linea}
                  stroke={COLOR_VPP}
                  strokeWidth={compacto ? 3 : 4}
                  strokeDasharray={compacto ? "6 4" : "10 6"}
                  ifOverflow="visible"
                  label={{
                    value: etiquetaLinea,
                    position: "top",
                    fill: COLOR_VPP,
                    fontSize: compacto ? 13 : medio ? 20 : 24,
                    fontWeight: 700,
                    textAnchor: anclajeEtiquetaVpp(linea),
                  }}
                />
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {compacto && !vacio ? <p className="text-center text-sm font-medium text-muted">Estimación (%), en rangos de 10</p> : null}

      {/* El contenedor sr-only recorta la tabla; sola, su contenido ensanchaba la página en móvil. */}
      <div className="sr-only">
        <table>
          <caption>Cantidad de estimaciones por rango de porcentaje</caption>
          <thead>
            <tr>
              <th scope="col">Rango (%)</th>
              <th scope="col">Estimaciones</th>
              <th scope="col">Proporción</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.etiqueta}>
                <th scope="row">{f.etiqueta}</th>
                <td>{f.cantidad}</td>
                <td>{formatoPct(f.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
