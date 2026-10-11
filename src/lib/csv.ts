export type CeldaCsv = string | number | boolean | null | undefined;

/** Escapa una celda CSV y neutraliza inyección de fórmulas (= + - @). */
export function celdaCsv(v: CeldaCsv): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  const texto = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV UTF-8 con BOM (Excel) y saltos CRLF. */
export function aCsv(cabecera: string[], filas: CeldaCsv[][]): string {
  const lineas = [cabecera, ...filas].map((f) => f.map(celdaCsv).join(","));
  return "﻿" + lineas.join("\r\n") + "\r\n";
}
