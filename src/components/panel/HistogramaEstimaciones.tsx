"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
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

/** Histograma de las estimaciones del público con una línea vertical en el VPP teórico. */
export function HistogramaEstimaciones({ histograma, vppTeoricoPct, totalRespuestas }: Props) {
  const reducido = useReducedMotion();
  const filas = useMemo(() => (histograma ? datosHistograma(histograma) : []), [histograma]);
  const linea = vppTeoricoPct === undefined ? undefined : posicionLineaVpp(vppTeoricoPct).posicion;
  const etiquetaLinea = vppTeoricoPct === undefined ? "" : `VPP teórico ${formatoPct(vppTeoricoPct)}`;
  const vacio = filas.length === 0 || totalRespuestas === 0;

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 p-6">
      <h2 className="font-display text-3xl font-bold">¿Qué estimó el público?</h2>
      <div className="relative h-80 min-h-0 flex-1" role="img" aria-label={`Histograma de estimaciones. ${etiquetaLinea}.`}>
        {filas.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <BarChart data={filas} margin={{ top: 44, right: 24, bottom: 4, left: 0 }} barCategoryGap="12%">
              <defs>
                <pattern id={ID_PATRON} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="10" height="10" fill={COLOR_BARRA} />
                  <rect width="4" height="10" fill="rgb(0 0 0 / 0.35)" />
                </pattern>
              </defs>
              <XAxis dataKey="etiqueta" tick={{ fill: COLOR_TEXTO, fontSize: 20 }} tickLine={false} axisLine={{ stroke: COLOR_MUTED }} interval={0} />
              <XAxis xAxisId={EJE_LINEA} type="number" domain={[0, 10]} hide />
              <YAxis allowDecimals={false} width={48} tick={{ fill: COLOR_MUTED, fontSize: 18 }} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.15))]} />
              <Bar dataKey="cantidad" fill={`url(#${ID_PATRON})`} stroke={COLOR_BARRA} strokeWidth={2} radius={[6, 6, 0, 0]} isAnimationActive={!reducido}>
                <LabelList dataKey="cantidad" position="top" fill={COLOR_TEXTO} fontSize={22} fontWeight={700} />
              </Bar>
              {linea !== undefined ? (
                <ReferenceLine
                  xAxisId={EJE_LINEA}
                  x={linea}
                  stroke={COLOR_VPP}
                  strokeWidth={4}
                  strokeDasharray="10 6"
                  ifOverflow="visible"
                  label={{
                    value: etiquetaLinea,
                    position: "top",
                    fill: COLOR_VPP,
                    fontSize: 24,
                    fontWeight: 700,
                    textAnchor: anclajeEtiquetaVpp(linea),
                  }}
                />
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        ) : null}
        {vacio ? (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-2xl font-semibold text-muted">
            Aún no hay respuestas. ¡Escanea el QR y juega!
          </p>
        ) : null}
      </div>

      <table className="sr-only">
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
    </Card>
  );
}
