import { describe, expect, it } from "vitest";
import { formatearFechaInsignia, IDS_INSIGNIAS, medallasInsignias, resolverInsignias } from "./insignias";
import { informacionInsignias } from "./ranking";

describe("catálogo de insignias", () => {
  it("incluye las medallas nuevas con su icono y título", () => {
    expect(resolverInsignias(["rayo", "sin-panico", "experto"]).map(({ id, titulo, icono }) => ({ id, titulo, icono }))).toEqual([
      { id: "rayo", titulo: "Rayo", icono: "zap" },
      { id: "sin-panico", titulo: "Sin pánico", icono: "leaf" },
      { id: "experto", titulo: "Experto", icono: "flask-conical" },
    ]);
  });

  it("los ids de persistencia salen del catálogo completo", () => {
    expect(IDS_INSIGNIAS).toHaveLength(7);
    expect(IDS_INSIGNIAS).toContain("rayo");
  });
});

describe("medallasInsignias", () => {
  it("muestra todo el catálogo bloqueado, sin la legada que ya no se puede ganar", () => {
    const medallas = medallasInsignias([]);
    expect(medallas.map((m) => m.info.id)).toEqual(["perfecto", "ojo-clinico", "cazador", "experto", "rayo", "sin-panico"]);
    expect(medallas.every((m) => !m.ganada)).toBe(true);
    expect(medallas.find((m) => m.info.id === "rayo")?.requisito).toBe("Termina la ronda en menos de 60 segundos.");
  });

  it("marca como ganadas las del jugador y conserva el orden del catálogo", () => {
    const medallas = medallasInsignias(["rayo", "perfecto"]);
    expect(medallas.filter((m) => m.ganada).map((m) => m.info.id)).toEqual(["perfecto", "rayo"]);
  });

  it("muestra la legada solo si ya estaba ganada", () => {
    expect(medallasInsignias(["bayesiano-nato"]).map((m) => m.info.id)).toContain("bayesiano-nato");
  });

  it("ignora ids que ya no están en el catálogo", () => {
    expect(medallasInsignias(["retirada"]).some((m) => m.ganada)).toBe(false);
  });

  it("añade la fecha solo a las ganadas que la tienen", () => {
    const medallas = medallasInsignias(["rayo", "perfecto"], { rayo: "2026-10-19T10:00:00.000Z", cazador: "2026-10-01T00:00:00.000Z" });
    expect(medallas.find((m) => m.info.id === "rayo")?.fecha).toBe("2026-10-19T10:00:00.000Z");
    expect(medallas.find((m) => m.info.id === "perfecto")?.fecha).toBeUndefined();
    expect(medallas.find((m) => m.info.id === "cazador")?.fecha).toBeUndefined();
  });
});

describe("formatearFechaInsignia", () => {
  it("escribe la fecha en español de Nicaragua, en hora de Managua", () => {
    // 03:00 UTC del 19 todavía es 18 en Managua (UTC−6).
    expect(formatearFechaInsignia("2026-10-19T03:00:00.000Z")).toBe("18 de octubre de 2026");
    expect(formatearFechaInsignia("2026-10-19T10:00:00.000Z")).toBe("19 de octubre de 2026");
  });

  it("devuelve cadena vacía con una fecha inválida", () => {
    expect(formatearFechaInsignia("no es fecha")).toBe("");
  });
});

describe("chips del ranking", () => {
  it("las medallas nuevas llegan al panel con su propio icono", () => {
    const chips = informacionInsignias(["rayo", "sin-panico", "experto", "perfecto"]);
    expect(chips.map((c) => c.icono)).toEqual(["zap", "leaf", "flask-conical", "smile"]);
    expect(chips.map((c) => c.titulo)).toEqual(["Rayo", "Sin pánico", "Experto", "Ronda perfecta"]);
  });
});
