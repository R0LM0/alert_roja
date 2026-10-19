import { afterEach, describe, expect, it, vi } from "vitest";
import type { AlmacenTexto } from "./cola-offline";
import { resolverInsignias } from "./insignias";
import { armarPartida, crearRonda } from "./ronda";
import { guardarApodo, guardarInsignias, guardarResultado, leerApodo, leerInsignias, leerResultado, limpiar, limpiarInsignias, validarApodo } from "./sesion-juego";
import type { InsigniaInfo } from "./resultado";

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

const PERFECTO: InsigniaInfo = { id: "perfecto", titulo: "Ronda perfecta", descripcion: "10 decisiones", icono: "smile" };
const CAZADOR: InsigniaInfo = { id: "cazador", titulo: "Cazador de contagios", descripcion: "Sin contagios", icono: "shield-check" };

// Cada fecha del historial es la de la primera ronda que otorgó la insignia.
afterEach(() => vi.useRealTimers());

describe("insignias locales", () => {
  it("agrega las insignias de rondas completas al mismo apodo normalizado", () => {
    const a = almacen();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00.000Z"));
    guardarInsignias("  ANA  ", [PERFECTO], a);
    vi.setSystemTime(new Date("2026-10-20T10:00:00.000Z"));
    guardarInsignias("ana", [CAZADOR], a);
    expect(leerInsignias(" Ana ", a)).toEqual([
      { id: "perfecto", fecha: "2026-10-19T10:00:00.000Z" },
      { id: "cazador", fecha: "2026-10-20T10:00:00.000Z" },
    ]);
    expect(JSON.parse(a.getItem("alerta-roja:insignias")!)).toEqual([{ jugador: "ana", insignias: [
      { id: "perfecto", fecha: "2026-10-19T10:00:00.000Z" },
      { id: "cazador", fecha: "2026-10-20T10:00:00.000Z" },
    ] }]);
    limpiarInsignias(a);
    expect(leerInsignias("Ana", a)).toEqual([]);
  });

  it("guarda una sola vez cada id y conserva la primera fecha", () => {
    const a = almacen();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00.000Z"));
    guardarInsignias("Ana", [PERFECTO, PERFECTO], a);
    vi.setSystemTime(new Date("2026-10-21T10:00:00.000Z"));
    guardarInsignias("Ana", [PERFECTO], a);
    expect(leerInsignias("Ana", a)).toEqual([
      { id: "perfecto", fecha: "2026-10-19T10:00:00.000Z" },
    ]);
  });

  it("ignora ids desconocidos y no crea apodos vacíos", () => {
    const a = almacen();
    guardarInsignias("Ana", [{ ...PERFECTO, id: "inventada" as InsigniaInfo["id"] }, PERFECTO], a);
    guardarInsignias("  ", [PERFECTO], a);
    expect(leerInsignias("Ana", a).map((i) => i.id)).toEqual(["perfecto"]);
    expect(leerInsignias("  ", a)).toEqual([]);
  });

  it("resuelve el historial con las etiquetas actuales y omite un id retirado", () => {
    const a = almacen();
    a.setItem("alerta-roja:insignias", JSON.stringify([{ jugador: "ana", insignias: [
      { id: "retirada", fecha: "2026-10-18T10:00:00.000Z" },
      { id: "perfecto", titulo: "Título antiguo", icono: "brain", fecha: "2026-10-19T10:00:00.000Z" },
    ] }]));
    const guardadas = leerInsignias("Ana", a);
    expect(guardadas).toEqual([{ id: "perfecto", fecha: "2026-10-19T10:00:00.000Z" }]);
    expect(resolverInsignias(["retirada", ...guardadas.map((i) => i.id)])).toEqual([
      { id: "perfecto", titulo: "Ronda perfecta", descripcion: "Tomaste las 10 decisiones de mayor valor esperado de la ronda.", icono: "smile" },
    ]);
  });

  it("contenido corrupto o estructura inválida se interpreta como historial vacío", () => {
    const a = almacen();
    a.setItem("alerta-roja:insignias", "{roto");
    expect(leerInsignias("Ana", a)).toEqual([]);
    guardarInsignias("Ana", [PERFECTO], a);
    expect(leerInsignias("Ana", a)).toHaveLength(1);
    a.setItem("alerta-roja:insignias", JSON.stringify([{ jugador: "ana", insignias: [{ id: "inventada" }] }]));
    expect(leerInsignias("Ana", a)).toEqual([]);
  });

  it("almacenamiento bloqueado o sin cuota nunca lanza ni muestra insignias", () => {
    const bloqueado: AlmacenTexto = {
      getItem: () => { throw new Error("privado"); },
      setItem: () => { throw new Error("cuota"); },
      removeItem: () => { throw new Error("privado"); },
    };
    expect(() => guardarInsignias("Ana", [PERFECTO], bloqueado)).not.toThrow();
    expect(leerInsignias("Ana", bloqueado)).toEqual([]);
    expect(leerInsignias("Ana", null)).toEqual([]);
    expect(() => limpiarInsignias(bloqueado)).not.toThrow();
    const sinCuota: AlmacenTexto = {
      getItem: () => null,
      setItem: () => { throw new Error("cuota"); },
      removeItem: () => undefined,
    };
    expect(() => guardarInsignias("Ana", [PERFECTO], sinCuota)).not.toThrow();
    expect(leerInsignias("Ana", sinCuota)).toEqual([]);
  });

  it("limita a cuatro insignias por apodo y separa los apodos", () => {
    const a = almacen();
    const cuatro = [PERFECTO, CAZADOR,
      { ...PERFECTO, id: "ojo-clinico" as const },
      { ...PERFECTO, id: "bayesiano-nato" as const }];
    guardarInsignias("Ana", [...cuatro, PERFECTO], a);
    guardarInsignias("Beto", [CAZADOR], a);
    expect(leerInsignias("Ana", a).map((i) => i.id)).toEqual(["perfecto", "cazador", "ojo-clinico", "bayesiano-nato"]);
    expect(leerInsignias("Beto", a).map((i) => i.id)).toEqual(["cazador"]);
  });

  it("retiene solo veinte apodos y expulsa al más antiguo aunque haya vuelto a jugar", () => {
    const a = almacen();
    for (let i = 0; i < 20; i++) guardarInsignias(`Jugador ${i}`, [PERFECTO], a);
    guardarInsignias("Jugador 0", [CAZADOR], a);
    guardarInsignias("Jugador 20", [PERFECTO], a);
    expect(leerInsignias("Jugador 0", a)).toEqual([]);
    expect(leerInsignias("Jugador 1", a)).toHaveLength(1);
    expect(leerInsignias("Jugador 20", a)).toHaveLength(1);
  });
});

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
