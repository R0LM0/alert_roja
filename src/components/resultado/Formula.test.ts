import { describe, expect, it } from "vitest";
import { PREVALENCIA } from "@/lib/stats";
import { texBayes } from "@/lib/formula-bayes";
import { renderizarTex } from "./Formula";

describe("renderizarTex", () => {
  it("no emite un <script> aunque venga en el TeX", () => {
    const html = renderizarTex("x<script>alert(1)</script>\\text{<img src=x onerror=alert(1)>}");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
  });

  it("solo permite \\htmlClass; \\href no genera enlaces", () => {
    const html = renderizarTex("\\href{javascript:alert(1)}{x}");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });

  it("la fórmula de Bayes trae KaTeX y MathML, sin URLs remotas", () => {
    const t = texBayes(PREVALENCIA);
    for (const tex of [t.simbolica, t.sustitucion, t.resultado]) {
      const html = renderizarTex(tex, true);
      expect(html).toContain("katex");
      expect(html).toContain("<math");
      // El xmlns de MathML es un identificador, no una descarga.
      expect(html).not.toMatch(/(src|href)=|url\(/);
    }
    expect(renderizarTex(t.simbolica)).toContain("tex-num");
  });
});
