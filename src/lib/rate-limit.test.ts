import { describe, expect, it } from "vitest";
import { clientIp, crearLimitador } from "./rate-limit";

describe("limitador", () => {
  it("permite hasta max y bloquea con retryAfter", () => {
    let t = 0;
    const l = crearLimitador({ max: 3, ventanaMs: 60_000, ahora: () => t });
    expect(l.revisar("a").ok).toBe(true);
    t = 1000;
    expect(l.revisar("a").ok).toBe(true);
    t = 2000;
    expect(l.revisar("a").ok).toBe(true);
    t = 3000;
    const r = l.revisar("a");
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeg).toBe(57);
  });
  it("cuenta por clave", () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000, ahora: () => 0 });
    expect(l.revisar("a").ok).toBe(true);
    expect(l.revisar("b").ok).toBe(true);
    expect(l.revisar("a").ok).toBe(false);
  });
  it("la ventana se desliza", () => {
    let t = 0;
    const l = crearLimitador({ max: 1, ventanaMs: 1000, ahora: () => t });
    expect(l.revisar("a").ok).toBe(true);
    t = 1001;
    expect(l.revisar("a").ok).toBe(true);
  });
  it("clientIp usa el primer salto de x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" });
    expect(clientIp(h)).toBe("1.2.3.4");
    expect(clientIp(new Headers())).toBe("local");
  });
});
