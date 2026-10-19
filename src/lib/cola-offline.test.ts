import { describe, expect, it, vi } from "vitest";
import { crearCola, enviarPartida, enviarSinCola, type AlmacenTexto } from "./cola-offline";
import { armarPartida, crearRonda } from "./ronda";

function almacenFalso(inicial: Record<string, string> = {}): AlmacenTexto {
  const datos = { ...inicial };
  return {
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => void (datos[k] = v),
    removeItem: (k) => void delete datos[k],
  };
}

const DUENO = "5b1c9e2a-7d3f-4e8a-9c60-2f4b8d1e7a35";

function partida(jugador = "Ana") {
  const ronda = crearRonda(`s-${jugador}`, 0.1, () => 0.9);
  return armarPartida(
    jugador,
    0.1,
    ronda.map((p) => ({ paciente: p, estimacion_pct: 33, decision: "liberar" as const, tiempo_ms: 500 })),
    DUENO,
  );
}

const respuesta = (status: number, cuerpo: unknown = {}) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } }));

describe("idempotencia", () => {
  const id = "3f2b8c1e-9d4a-4b7e-8a61-0c5d2e7f9a10";
  const conId = () => ({ ...partida("Id"), id });

  it("la cola conserva el id y el reintento envía exactamente el mismo cuerpo", async () => {
    const cola = crearCola(almacenFalso());
    const fallo = () => Promise.reject(new Error("red"));
    await enviarPartida(conId(), { fetchFn: fallo, cola });
    expect(cola.pendientes()[0].id).toBe(id);

    const cuerpos: string[] = [];
    await cola.reintentar(async (p) => {
      const r = await enviarSinCola(p, (_u, init) => {
        cuerpos.push(String(init.body));
        return respuesta(200, { id, puntaje: 40 });
      });
      return r.estado !== "pendiente";
    });
    expect(JSON.parse(cuerpos[0]).id).toBe(id);
    expect(cola.pendientes()).toEqual([]);
  });

  it("conserva estimaciones nulas al reintentar sin cambiar el payload", async () => {
    const sinEstimacion = { ...conId(), respuestas: conId().respuestas.map((r) => ({ ...r, estimacion_pct: null })) };
    const cola = crearCola(almacenFalso());
    cola.encolar(sinEstimacion);
    const cuerpos: string[] = [];
    await cola.reintentar(async (p) => {
      await enviarSinCola(p, (_url, init) => {
        cuerpos.push(String(init.body));
        return respuesta(200, { id, puntaje: 5 });
      });
      return true;
    });
    expect(JSON.parse(cuerpos[0])).toEqual(sinEstimacion);
  });

  it("un 200 (partida ya existente) cuenta como guardado", async () => {
    const r = await enviarSinCola(conId(), () => respuesta(200, { id, puntaje: 40 }));
    expect(r).toEqual({ estado: "guardado", id, puntaje: 40 });
  });
});

describe("crearCola", () => {
  it("encola y lista en orden", () => {
    const cola = crearCola(almacenFalso());
    cola.encolar(partida("A"));
    cola.encolar(partida("B"));
    expect(cola.pendientes().map((p) => p.jugador)).toEqual(["A", "B"]);
  });

  it("ignora JSON corrupto y entradas inválidas", () => {
    const k = "alerta-roja:cola";
    expect(crearCola(almacenFalso({ [k]: "{no es json" })).pendientes()).toEqual([]);
    const mezcla = JSON.stringify([{ jugador: "x" }, partida("Ok")]);
    expect(crearCola(almacenFalso({ [k]: mezcla })).pendientes().map((p) => p.jugador)).toEqual(["Ok"]);
  });

  it("no revienta si el almacenamiento lanza (modo privado)", () => {
    const denegado = () => {
      throw new Error("denegado");
    };
    const cola = crearCola({ getItem: denegado, setItem: denegado, removeItem: denegado });
    expect(() => cola.encolar(partida())).not.toThrow();
    expect(cola.pendientes()).toEqual([]);
  });

  it("sin almacenamiento (null) se comporta como vacío", () => {
    const cola = crearCola(null);
    cola.encolar(partida());
    expect(cola.pendientes()).toEqual([]);
  });

  it("reintentar quita solo lo enviado, en orden, y se detiene en el primer fallo", async () => {
    const cola = crearCola(almacenFalso());
    ["A", "B", "C"].forEach((j) => cola.encolar(partida(j)));
    const vistos: string[] = [];
    await cola.reintentar(async (p) => {
      vistos.push(p.jugador);
      return p.jugador === "A";
    });
    expect(vistos).toEqual(["A", "B"]);
    expect(cola.pendientes().map((p) => p.jugador)).toEqual(["B", "C"]);
  });

  it("reintentar conserva todo si el envío lanza", async () => {
    const cola = crearCola(almacenFalso());
    cola.encolar(partida("A"));
    await cola.reintentar(async () => {
      throw new Error("red");
    });
    expect(cola.pendientes()).toHaveLength(1);
  });
});

describe("enviarPartida", () => {
  it("201 -> guardado con id y puntaje", async () => {
    const cola = crearCola(almacenFalso());
    const fetchFn = vi.fn(() => respuesta(201, { id: "abc", puntaje: 500 }));
    const r = await enviarPartida(partida(), { fetchFn, cola });
    expect(r).toEqual({ estado: "guardado", id: "abc", puntaje: 500 });
    expect(cola.pendientes()).toEqual([]);
    expect(fetchFn).toHaveBeenCalledWith("/api/partidas", expect.objectContaining({ method: "POST" }));
  });

  it.each([500, 503, 429])("%i -> pendiente y queda en cola", async (status) => {
    const cola = crearCola(almacenFalso());
    const r = await enviarPartida(partida(), { fetchFn: () => respuesta(status), cola });
    expect(r).toEqual({ estado: "pendiente" });
    expect(cola.pendientes()).toHaveLength(1);
  });

  it("error de red -> pendiente y queda en cola", async () => {
    const cola = crearCola(almacenFalso());
    const r = await enviarPartida(partida(), { fetchFn: () => Promise.reject(new TypeError("fetch failed")), cola });
    expect(r).toEqual({ estado: "pendiente" });
    expect(cola.pendientes()).toHaveLength(1);
  });

  it("400 -> rechazado, NO se encola", async () => {
    const cola = crearCola(almacenFalso());
    const r = await enviarPartida(partida(), { fetchFn: () => respuesta(400, { error: "Datos inválidos" }), cola });
    expect(r).toEqual({ estado: "rechazado", mensaje: "Datos inválidos" });
    expect(cola.pendientes()).toEqual([]);
  });

  it("enviarSinCola distingue reintentable de rechazado", async () => {
    expect((await enviarSinCola(partida(), () => respuesta(500))).estado).toBe("pendiente");
    expect((await enviarSinCola(partida(), () => respuesta(413))).estado).toBe("rechazado");
  });
});
