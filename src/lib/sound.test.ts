import { describe, expect, it } from "vitest";
import { leerSilencioGuardado } from "./sound";

const almacen = (valor: string | null) => ({ getItem: () => valor });

describe("leerSilencioGuardado", () => {
  it("silenciado por defecto cuando no hay preferencia", () => {
    expect(leerSilencioGuardado(almacen(null))).toBe(true);
  });

  it("respeta el sonido activado guardado", () => {
    expect(leerSilencioGuardado(almacen("0"))).toBe(false);
  });

  it("respeta el silencio guardado", () => {
    expect(leerSilencioGuardado(almacen("1"))).toBe(true);
  });

  it("si el storage falla, queda silenciado", () => {
    const roto = {
      getItem: () => {
        throw new Error("storage bloqueado");
      },
    };
    expect(leerSilencioGuardado(roto)).toBe(true);
  });
});
