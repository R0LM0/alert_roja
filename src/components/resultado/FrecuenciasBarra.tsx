import { EyeOff, HeartPulse, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import type { PasosBayes } from "@/lib/formula-bayes";

type Grupo = {
  clave: keyof PasosBayes["conteos"];
  etiqueta: string;
  Icono: LucideIcon;
  /** Color del segmento (tokens) y del icono. */
  fondo: string;
  texto: string;
};

const GRUPOS: readonly Grupo[] = [
  { clave: "vp", etiqueta: "Enfermas con positivo", Icono: HeartPulse, fondo: "bg-primary", texto: "text-primary-text" },
  { clave: "fp", etiqueta: "Sanas con positivo", Icono: TriangleAlert, fondo: "bg-warning", texto: "text-warning" },
  { clave: "fn", etiqueta: "Enfermas con negativo", Icono: EyeOff, fondo: "bg-info", texto: "text-info" },
  { clave: "vn", etiqueta: "Sanas con negativo", Icono: ShieldCheck, fondo: "bg-success", texto: "text-success" },
];

/** Barra apilada de frecuencias naturales; cada grupo se identifica por icono, nombre y número. */
export function FrecuenciasBarra({ pasos }: { pasos: PasosBayes }) {
  return (
    <figure className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2"
      >
        {GRUPOS.map(({ clave, fondo }) => (
          <div
            key={clave}
            className={`${fondo} min-w-[3px]`}
            style={{ flexGrow: pasos.conteos[clave], flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {GRUPOS.map(({ clave, etiqueta, Icono, texto }) => (
          <li key={clave} className="flex items-center gap-2">
            <Icono aria-hidden="true" className={`size-5 shrink-0 ${texto}`} />
            <span className="text-muted">{etiqueta}</span>
            <span className="ml-auto font-bold tabular-nums">{pasos.conteos[clave]}</span>
          </li>
        ))}
      </ul>
      <figcaption className="text-muted">{pasos.texto.frecuencias}</figcaption>
    </figure>
  );
}
