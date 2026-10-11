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
  it("guarda y lee un resultado", () => {
    const a = almacen();
    guardarResultado(resultado(), a);
    expect(leerResultado(a)).toEqual(resultado());
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
