import { frecuenciasNaturales } from "@/lib/stats";

const COLORES = {
  vp: "var(--red)",
  fp: "var(--amber)",
  fn: "var(--blue)",
  vn: "var(--green)",
} as const;

/** 1000 puntos: la ciudad repartida en la tabla 2x2 (frecuencias naturales). */
export function Ciudad() {
  const f = frecuenciasNaturales();
  const puntos: (keyof typeof COLORES)[] = [
    ...Array<"vp">(f.vp).fill("vp"),
    ...Array<"fp">(f.fp).fill("fp"),
    ...Array<"fn">(f.fn).fill("fn"),
    ...Array<"vn">(f.vn).fill("vn"),
  ];
  return (
    <div>
      <div className="dots" aria-label="Ciudad de 1000 personas">
        {puntos.map((k, i) => (
          <span key={i} className="dot" style={{ background: COLORES[k] }} />
        ))}
      </div>
      <div className="legend">
        <span style={{ ["--c" as string]: COLORES.vp }}>Infectado, positivo ({f.vp})</span>
        <span style={{ ["--c" as string]: COLORES.fp }}>Sano, positivo ({f.fp})</span>
        <span style={{ ["--c" as string]: COLORES.fn }}>Infectado, negativo ({f.fn})</span>
        <span style={{ ["--c" as string]: COLORES.vn }}>Sano, negativo ({f.vn})</span>
      </div>
    </div>
  );
}
