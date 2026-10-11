import { describe, expect, it } from "vitest";
import { tieneGroseria } from "./profanity";

describe("filtro de groserías", () => {
  it("detecta ignorando mayúsculas y tildes", () => {
    expect(tieneGroseria("PUTA")).toBe(true);
    expect(tieneGroseria("Mierdá")).toBe(true);
  });
  it("detecta dentro de otras palabras y con símbolos intermedios", () => {
    expect(tieneGroseria("xXputoXx")).toBe(true);
    expect(tieneGroseria("p.u.t.o")).toBe(true);
  });
  it("acepta apodos normales", () => {
    expect(tieneGroseria("Camila")).toBe(false);
    expect(tieneGroseria("Dr. Bayes")).toBe(false);
  });
});
