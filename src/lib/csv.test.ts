import { describe, expect, it } from "vitest";
import { aCsv, celdaCsv } from "./csv";

describe("csv", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(celdaCsv('a"b')).toBe('"a""b"');
    expect(celdaCsv("a,b")).toBe('"a,b"');
    expect(celdaCsv("a\nb")).toBe('"a\nb"');
    expect(celdaCsv("simple")).toBe("simple");
  });
  it("neutraliza inyección de fórmulas", () => {
    expect(celdaCsv("=1+1")).toBe("'=1+1");
    expect(celdaCsv("+cmd")).toBe("'+cmd");
    expect(celdaCsv("-2")).toBe("'-2");
    expect(celdaCsv("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(celdaCsv('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
  });
  it("booleanos como 1/0 y números tal cual", () => {
    expect(celdaCsv(true)).toBe("1");
    expect(celdaCsv(false)).toBe("0");
    expect(celdaCsv(42)).toBe("42");
    expect(celdaCsv(null)).toBe("");
  });
  it("aCsv antepone BOM y usa CRLF", () => {
    const s = aCsv(["a", "b"], [[1, "x,y"]]);
    expect(s.startsWith("﻿")).toBe(true);
    expect(s).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});
