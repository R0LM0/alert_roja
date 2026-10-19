import { describe, expect, it } from "vitest";
import { duenoLocal, normalizarApodo, reservarApodo, sugerenciasPara, variantesApodo } from "./apodos";
import type { AlmacenTexto } from "./cola-offline";
import { normalizarApodo as normalizarEnRanking } from "./ranking";
import { partidaSchema } from "./schema";

function almacenFalso(inicial: Record<string, string> = {}): AlmacenTexto & { datos: Record<string, string> } {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => void (datos[k] = v),
    removeItem: (k) => void delete datos[k],
  };
}

const almacenRoto: AlmacenTexto = {
  getItem: () => {
    throw new Error("denegado");
  },
  setItem: () => {
    throw new Error("denegado");
  },
  removeItem: () => {
    throw new Error("denegado");
  },
};

const respuesta = (status: number, cuerpo: unknown = {}) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } }));

const DUENO = "5b1c9e2a-7d3f-4e8a-9c60-2f4b8d1e7a35";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("normalizarApodo", () => {
  it("quita espacios de los bordes y pasa a minúsculas", () => {
    expect(normalizarApodo("  Dra. Lucía ")).toBe("dra. lucía");
    expect(normalizarApodo("ANA")).toBe(normalizarApodo(" ana "));
  });

  it("el ranking usa la misma función", () => {
    expect(normalizarEnRanking).toBe(normalizarApodo);
  });
});

describe("variantesApodo", () => {
  it("agrega números y nunca pasa de 20 caracteres", () => {
    expect(variantesApodo("Ana").slice(0, 3)).toEqual(["Ana2", "Ana3", "Ana4"]);
    for (const v of variantesApodo("Dra. Lucía Fernández")) expect(v.length).toBeLessThanOrEqual(20);
    for (const v of variantesApodo("abcdefghijklmnopqrst")) expect(v.length).toBeLessThanOrEqual(20);
  });

  it("cada variante es un apodo válido para el servidor", () => {
    for (const v of variantesApodo("Pedro Ramírez Gómez"))
      expect(partidaSchema.shape.jugador.safeParse(v).success).toBe(true);
  });
});

describe("sugerenciasPara", () => {
  it("devuelve 3 variantes libres en orden", () => {
    expect(sugerenciasPara("Ana", new Set())).toEqual(["Ana2", "Ana3", "Ana4"]);
  });

  it("se salta las ocupadas, sin distinguir mayúsculas", () => {
    expect(sugerenciasPara("Ana", new Set(["ana2", "ana3"]))).toEqual(["Ana4", "Ana5", "Ana6"]);
  });

  it("devuelve menos si no hay suficientes libres", () => {
    const ocupados = new Set(variantesApodo("Ana").slice(0, 11).map(normalizarApodo));
    expect(sugerenciasPara("Ana", ocupados)).toEqual([variantesApodo("Ana")[11]]);
    expect(sugerenciasPara("Ana", new Set(variantesApodo("Ana").map(normalizarApodo)))).toEqual([]);
  });

  it("acepta cantidad personalizada", () => {
    expect(sugerenciasPara("Ana", new Set(), 1)).toEqual(["Ana2"]);
  });
});

describe("duenoLocal", () => {
  it("genera un uuid la primera vez y lo guarda", () => {
    const almacen = almacenFalso();
    const d = duenoLocal(almacen);
    expect(d).toMatch(UUID);
    expect(almacen.datos["alerta-roja:dueno"]).toBe(d);
  });

  it("reusa el guardado", () => {
    const guardado = "5b1c9e2a-7d3f-4e8a-9c60-2f4b8d1e7a35";
    expect(duenoLocal(almacenFalso({ "alerta-roja:dueno": guardado }))).toBe(guardado);
  });

  it("reemplaza un valor guardado que no es uuid", () => {
    const almacen = almacenFalso({ "alerta-roja:dueno": "basura" });
    const d = duenoLocal(almacen);
    expect(d).toMatch(UUID);
    expect(almacen.datos["alerta-roja:dueno"]).toBe(d);
  });

  it("sin almacenamiento usable, mantiene el mismo token durante la pestaña", () => {
    const a = duenoLocal(almacenRoto);
    expect(a).toMatch(UUID);
    expect(duenoLocal(almacenRoto)).toBe(a);
    expect(duenoLocal(null)).toBe(a);
  });
});

describe("reservarApodo", () => {
  it("envía apodo y dueno a /api/apodos", async () => {
    let url = "";
    let cuerpo = "";
    const r = await reservarApodo("Ana", DUENO, (u, i) => {
      url = u;
      cuerpo = String(i.body);
      return respuesta(200, { ok: true });
    });
    expect(url).toBe("/api/apodos");
    expect(JSON.parse(cuerpo)).toEqual({ apodo: "Ana", dueno: DUENO });
    expect(r).toEqual({ estado: "libre" });
  });

  it("409 devuelve el mensaje y las sugerencias", async () => {
    const r = await reservarApodo("Ana", DUENO, () =>
      respuesta(409, { error: "Ese apodo ya está en uso", sugerencias: ["Ana2", "Ana3"] }),
    );
    expect(r).toEqual({ estado: "ocupado", mensaje: "Ese apodo ya está en uso", sugerencias: ["Ana2", "Ana3"] });
  });

  it("409 sin sugerencias válidas deja la lista vacía", async () => {
    const r = await reservarApodo("Ana", DUENO, () => respuesta(409, { sugerencias: [1, null] }));
    expect(r).toMatchObject({ estado: "ocupado", sugerencias: [] });
  });

  it("400 es un rechazo que bloquea el juego", async () => {
    expect(await reservarApodo("Ana", DUENO, () => respuesta(400, { error: "Datos inválidos" }))).toEqual({
      estado: "rechazado",
      mensaje: "Elige otro apodo",
    });
  });

  it("sin red o con error del servidor deja seguir al jugador", async () => {
    const red = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await reservarApodo("Ana", DUENO, red)).toEqual({ estado: "sin-conexion" });
    expect(await reservarApodo("Ana", DUENO, () => respuesta(500, { error: "x" }))).toEqual({
      estado: "sin-conexion",
    });
    expect(await reservarApodo("Ana", DUENO, () => respuesta(429, { error: "x" }))).toEqual({
      estado: "sin-conexion",
    });
  });
});
