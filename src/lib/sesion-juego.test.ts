import { describe, expect, it } from "vitest";
import type { AlmacenTexto } from "./cola-offline";
import { armarPartida, crearRonda } from "./ronda";
import { guardarApodo, guardarResultado, leerApodo, leerResultado, limpiar, validarApodo } from "./sesion-juego";

function almacen(): AlmacenTexto {
  const d: Record<string, string> = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => void (d[k] = v), removeItem: (k) => void delete d[k] };
}

function resultado() {
  const ronda = crearRonda("s", 0.1, () => 0.2);
  const partida = armarPartida(
    "Ana",
    0.1,
    ronda.map((p) => ({ paciente: p, estimacion_pct: 40, decision: "aislar" as const, tiempo_ms: 800 })),
  );
  return {
    jugador: "Ana",
    modo: "normal" as const,
    ronda,
    respuestas: partida.respuestas,
    estado: "guardado" as const,
    id: "u1",
    puntaje: 700,
  };
}

describe("sesion-juego", () => {
  it("conserva todas las evidencias al leer la ronda y rechaza evidencias inválidas o ausentes", () => {
    const a = almacen();
    const r = resultado();
    const evidencias = ["conviviente", "contacto", "sintomas", "sin-antecedentes", "protegido"] as const;
    const conEvidencia = { ...r, ronda: r.ronda.map((p, i) => ({ ...p, evidencia: evidencias[i % evidencias.length] })) };
    guardarResultado(conEvidencia, a);
    expect(leerResultado(a)?.ronda.map((p) => p.evidencia)).toEqual([...evidencias, ...evidencias]);
    a.setItem("alerta-roja:resultado", JSON.stringify({ ...conEvidencia, ronda: conEvidencia.ronda.map((p, i) => i ? p : { ...p, evidencia: "desconocida" }) }));
    expect(leerResultado(a)).toBeNull();
    a.setItem("alerta-roja:resultado", JSON.stringify({ ...conEvidencia, ronda: conEvidencia.ronda.map(({ evidencia: _evidencia, ...p }) => p) }));
    expect(leerResultado(a)).toBeNull();
  });
  it("guarda y lee un resultado", () => {
    const a = almacen();
    guardarResultado(resultado(), a);
    expect(leerResultado(a)).toEqual(resultado());
  });

  it("recupera resultados nuevos con estimaciones nulas y antiguos con estimaciones", () => {
    const a = almacen();
    const antiguo = resultado();
    guardarResultado(antiguo, a);
    expect(leerResultado(a)?.respuestas[0].estimacion_pct).toBe(40);
    const nuevo = { ...antiguo, respuestas: antiguo.respuestas.map((r) => ({ ...r, estimacion_pct: null })) };
    guardarResultado(nuevo, a);
    expect(leerResultado(a)).toEqual(nuevo);
  });

  it("limpiar borra el resultado", () => {
    const a = almacen();
    guardarResultado(resultado(), a);
    limpiar(a);
    expect(leerResultado(a)).toBeNull();
  });

  it("devuelve null si el contenido es inválido o no es JSON", () => {
    const a = almacen();
    a.setItem("alerta-roja:resultado", "{roto");
    expect(leerResultado(a)).toBeNull();
    a.setItem("alerta-roja:resultado", JSON.stringify({ jugador: "x" }));
    expect(leerResultado(a)).toBeNull();
  });

  it("apodo: guarda, lee y tolera almacenamiento nulo", () => {
    const a = almacen();
    expect(leerApodo(a)).toBeNull();
    guardarApodo("Ana", a);
    expect(leerApodo(a)).toBe("Ana");
    expect(leerApodo(null)).toBeNull();
    expect(() => guardarApodo("Ana", null)).not.toThrow();
  });

  it('validarApodo: vacío, largo y groserías dan error; un apodo normal no', () => {
    expect(validarApodo('   ')).toMatch(/apodo/i);
    expect(validarApodo('a'.repeat(21))).toMatch(/20/);
    expect(validarApodo('Mierda')).toMatch(/otro/i);
    expect(validarApodo('  Dra. Lucía ')).toBeNull();
  });
});
