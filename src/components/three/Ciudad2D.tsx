"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  calcularLayout,
  CENTRO_BLOQUE,
  contarPorGrupo,
  LIENZO,
  ORDEN_GRUPOS,
  TOTAL_ESFERAS,
  type FaseCiudad,
  type Frecuencias,
  type GrupoClave,
} from "@/lib/ciudad-layout";
import { coloresTema } from "@/lib/confeti";
import { Leyenda } from "@/components/game/leyenda";

interface Ciudad2DProps {
  frecuencias: Frecuencias;
  fase: FaseCiudad;
  reducido?: boolean;
}

const COLOR_POR_GRUPO: Record<GrupoClave, "primary" | "warning" | "info" | "success"> = {
  VP: "primary",
  FP: "warning",
  FN: "info",
  VN: "success",
};

const ALTO_RELATIVO = 0.6;

/**
 * Fallback 2D de la Ciudad: misma lógica de reparto y mismas
 * frecuencias que el 3D, dibujadas en canvas.
 */
export function Ciudad2D({ frecuencias, fase, reducido = false }: Ciudad2DProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const esferas = useMemo(
    () => calcularLayout(frecuencias),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frecuencias.vp, frecuencias.fp, frecuencias.fn, frecuencias.vn],
  );
  const conteo = useMemo(() => contarPorGrupo(esferas), [esferas]);
  const faseRef = useRef(fase);
  faseRef.current = fase;

  useEffect(() => {
    const canvas = lienzoRef.current;
    const caja = contenedor.current;
    if (!canvas || !caja) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const actual = new Float32Array(TOTAL_ESFERAS * 3);
    esferas.forEach((e, i) => {
      actual[i * 3] = e.ciudad[0];
      actual[i * 3 + 1] = e.ciudad[1];
    });

    const estatico =
      reducido ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    let raf = 0;
    let activo = true;

    const medir = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.max(1, caja.clientWidth);
      const h = Math.round(w * ALTO_RELATIVO);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    const aPixel = (x: number, y: number): [number, number] => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      return [((x + LIENZO.ancho / 2) / LIENZO.ancho) * w, ((LIENZO.alto / 2 - y) / LIENZO.alto) * h];
    };

    const dibujar = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const tema = coloresTema();
      const paso = estatico ? 1 : 0.08;
      const objetivo = faseRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      const radio = Math.max(1.5, canvas.width / dpr / LIENZO.ancho / 2.4);
      for (let i = 0; i < TOTAL_ESFERAS; i++) {
        const t = objetivo === "tabla" ? esferas[i].tabla : esferas[i].ciudad;
        const j = i * 3;
        actual[j] += (t[0] - actual[j]) * paso;
        actual[j + 1] += (t[1] - actual[j + 1]) * paso;
        const [px, py] = aPixel(actual[j], actual[j + 1]);
        ctx.fillStyle = tema[COLOR_POR_GRUPO[esferas[i].grupo]];
        ctx.beginPath();
        ctx.arc(px, py, radio, 0, Math.PI * 2);
        ctx.fill();
      }
      // Etiquetas por bloque (misma estadística que el 3D).
      if (objetivo === "tabla") {
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        for (const g of ORDEN_GRUPOS) {
          const [cx, cy] = CENTRO_BLOQUE[g];
          const [, tope] = aPixel(cx, cy + LIENZO.alto / 4 + 0.4);
          const [px] = aPixel(cx, cy);
          ctx.fillStyle = "#f4f6fb";
          ctx.fillText(`${g} · ${conteo[g]}`, px, Math.max(14, tope));
        }
      }
    };

    const fotograma = () => {
      if (!activo) return;
      dibujar();
      if (!estatico) raf = requestAnimationFrame(fotograma);
    };

    const alVisibilidad = () => {
      const visible = document.visibilityState === "visible";
      if (visible && !estatico && activo) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(fotograma);
      } else if (!visible) {
        cancelAnimationFrame(raf);
      }
    };

    medir();
    dibujar();
    if (!estatico) raf = requestAnimationFrame(fotograma);
    const observador = new ResizeObserver(() => {
      medir();
      dibujar();
    });
    observador.observe(caja);
    document.addEventListener("visibilitychange", alVisibilidad);
    return () => {
      activo = false;
      cancelAnimationFrame(raf);
      observador.disconnect();
      document.removeEventListener("visibilitychange", alVisibilidad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esferas]);

  return (
    <div>
      <div
        ref={contenedor}
        role="img"
        aria-label={`Revelación: ${conteo.VP} VP, ${conteo.FP} FP, ${conteo.FN} FN, ${conteo.VN} VN de 1000 personas`}
        className="w-full overflow-hidden rounded-lg border-2 border-border bg-background"
      >
        <canvas ref={lienzoRef} className="block" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ORDEN_GRUPOS.map((g) => (
          <Leyenda key={g} grupo={g} cantidad={conteo[g]} />
        ))}
      </div>
    </div>
  );
}
