import { describe, expect, it } from "vitest";
import { interpretarCierre } from "./cierre";
import { claveValida } from "./clave";

describe("interpretarCierre", () => {
  it("acepta ISO con zona y lo devuelve en UTC", () => {
    expect(interpretarCierre("2026-10-20T18:00:00-06:00")).toBe("2026-10-21T00:00:00.000Z");
    expect(interpretarCierre("2026-10-21T00:00:00Z")).toBe("2026-10-21T00:00:00.000Z");
  });

  it("ignora espacios alrededor", () => {
    expect(interpretarCierre("  2026-10-21T00:00:00Z  ")).toBe("2026-10-21T00:00:00.000Z");
  });

  it("sin valor o vacío no hay cierre", () => {
    expect(interpretarCierre(undefined)).toBeNull();
    expect(interpretarCierre("")).toBeNull();
    expect(interpretarCierre("   ")).toBeNull();
  });

  it("rechaza fechas sin zona horaria, texto y fechas imposibles", () => {
    expect(interpretarCierre("2026-10-20T18:00:00")).toBeNull();
    expect(interpretarCierre("mañana a las 6")).toBeNull();
    expect(interpretarCierre("2026-13-40T18:00:00Z")).toBeNull();
  });
});

describe("claveValida", () => {
  it("compara la clave exacta", () => {
    expect(claveValida("abc", "abc")).toBe(true);
    expect(claveValida("abd", "abc")).toBe(false);
    expect(claveValida("abcd", "abc")).toBe(false);
  });

  it("sin clave recibida o sin clave configurada no coincide", () => {
    expect(claveValida(null, "abc")).toBe(false);
    expect(claveValida(undefined, "abc")).toBe(false);
    expect(claveValida("", undefined)).toBe(false);
    expect(claveValida("", "")).toBe(false);
  });
});
