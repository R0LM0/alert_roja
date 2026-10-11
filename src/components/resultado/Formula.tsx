import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/** Compila TeX a HTML+MathML. Solo se permite `\htmlClass` (para colorear con tokens). */
export function renderizarTex(tex: string, displayMode = false): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode,
    output: "htmlAndMathml",
    strict: "ignore",
    trust: (ctx) => ctx.command === "\\htmlClass",
  });
}

type Props = {
  tex: string;
  displayMode?: boolean;
  ariaLabel: string;
  className?: string;
};

/**
 * Fórmula tipografiada con KaTeX. El scroll horizontal queda dentro de la caja.
 * `tex` viene siempre de constantes o números de funciones puras, nunca de texto del usuario;
 * KaTeX además escapa cualquier carácter HTML, por eso dangerouslySetInnerHTML es seguro aquí.
 */
export function Formula({ tex, displayMode = true, ariaLabel, className }: Props) {
  return (
    <div
      role="math"
      aria-label={ariaLabel}
      className={cn("max-w-full overflow-x-auto overflow-y-hidden py-1", className)}
      dangerouslySetInnerHTML={{ __html: renderizarTex(tex, displayMode) }}
    />
  );
}
