import { describe, expect, it } from "vitest";
import {
  esRevelarActivo,
  esquemaActividad,
  esquemaRanking,
  esquemaStats,
  formatoEntero,
  formatoNumero,
  formatoPct,
  formatoPuntaje,
  leerRevelar,
  queryConRevelar,
  tiempoRelativo,
  urlExport,
  urlJuego,
  urlLegible,
} from "./panel";

const porEvidencia = [
  { evidencia: "protegido", etiqueta: "Protegido", previoPct: 4, posteriorPct: 15.8, optima: "liberar", casos: 2, aislaronPct: 50 },
  { evidencia: "conviviente", etiqueta: "Conviviente", previoPct: 40, posteriorPct: 75, optima: "aislar", casos: 0, aislaronPct: null },
];

const statsBase = {
  prevalencia: 0.1,
  totalPartidas: 3,
  totalJugadores: 2,
  n: 2,
  vppTeoricoPct: 33.3,
  vppObservadoPct: 50,
  decisionesOptimasPct: 75,
  puntajePromedio: 7.5,
  porEvidencia,
};

describe("formato es", () => {
  it("usa coma decimal", () => {
    expect(formatoNumero(33.333)).toBe("33,3");
    expect(formatoNumero(4.348, 1)).toBe("4,3");
    expect(formatoNumero(7, 0)).toBe("7");
  });
  it("formatea porcentajes y devuelve — si no hay dato", () => {
    expect(formatoPct(33.333)).toBe("33,3 %");
    expect(formatoPct(null)).toBe("—");
    expect(formatoPct(undefined)).toBe("—");
    expect(formatoPct(Number.NaN)).toBe("—");
  });
  it("formatea enteros", () => {
    expect(formatoEntero(12)).toBe("12");
    expect(formatoEntero(0)).toBe("0");
  });
});

describe("formatoPuntaje", () => {
  it("un decimal con coma o guion si no hay dato", () => {
    expect(formatoPuntaje(6.44)).toBe("6,4");
    expect(formatoPuntaje(null)).toBe("—");
    expect(formatoPuntaje(Number.NaN)).toBe("—");
  });
});

describe("revelar respuesta", () => {
  it("solo 1 o true activan la revelación", () => {
    expect(esRevelarActivo("1")).toBe(true);
    expect(esRevelarActivo("true")).toBe(true);
    expect(esRevelarActivo("0")).toBe(false);
    expect(esRevelarActivo("")).toBe(false);
    expect(esRevelarActivo(null)).toBe(false);
  });

  it("lee ?revelar= de la query, con o sin signo de pregunta", () => {
    expect(leerRevelar("?key=x&revelar=1")).toBe(true);
    expect(leerRevelar("revelar=true")).toBe(true);
    expect(leerRevelar("?key=x")).toBe(false);
    expect(leerRevelar("")).toBe(false);
  });

  it("fija o quita el flag conservando el resto de parámetros", () => {
    expect(queryConRevelar("?key=x", true)).toBe("?key=x&revelar=1");
    expect(queryConRevelar("?key=x&revelar=1", false)).toBe("?key=x");
    expect(queryConRevelar("?revelar=1", false)).toBe("");
    expect(queryConRevelar("", true)).toBe("?revelar=1");
    expect(queryConRevelar("?key=a%20b&revelar=1", true)).toBe("?key=a+b&revelar=1");
  });
});

describe("urlJuego", () => {
  it("prefiere NEXT_PUBLIC_SITE_URL y deja una sola barra final", () => {
    expect(urlJuego("https://alerta.app", "http://localhost:3000")).toBe("https://alerta.app/");
    expect(urlJuego("https://alerta.app///", "http://x")).toBe("https://alerta.app/");
  });
  it("recurre al origin si no hay URL válida", () => {
    expect(urlJuego(undefined, "http://192.168.0.5:3000/")).toBe("http://192.168.0.5:3000/");
    expect(urlJuego("  ", "http://localhost:3000")).toBe("http://localhost:3000/");
    expect(urlJuego("alerta.app", "http://localhost:3000")).toBe("http://localhost:3000/");
  });
  it("devuelve cadena vacía si no hay nada", () => {
    expect(urlJuego(undefined, "")).toBe("");
  });
  it("urlLegible quita el protocolo", () => {
    expect(urlLegible("https://alerta.app/")).toBe("alerta.app");
    expect(urlLegible("http://192.168.0.5:3000/")).toBe("192.168.0.5:3000");
  });
});

describe("urlExport", () => {
  it("sin clave no agrega query", () => {
    expect(urlExport()).toBe("/api/export");
    expect(urlExport("")).toBe("/api/export");
  });
  it("codifica la clave", () => {
    expect(urlExport("a b&c")).toBe("/api/export?key=a%20b%26c");
  });
  it("el CSV usa formato=csv", () => {
    expect(urlExport(undefined, "csv")).toBe("/api/export?formato=csv");
    expect(urlExport("k", "csv")).toBe("/api/export?formato=csv&key=k");
  });
});

describe("esquemas de respuesta", () => {
  it("valida /api/stats con datos, sin datos y sin puntaje", () => {
    expect(esquemaStats.safeParse(statsBase).success).toBe(true);
    expect(esquemaStats.safeParse({ ...statsBase, n: 0, vppObservadoPct: null, decisionesOptimasPct: null, puntajePromedio: null, porEvidencia: [] }).success).toBe(true);
    expect(esquemaStats.safeParse({ ...statsBase, totalJugadores: undefined }).success).toBe(true);
    expect(esquemaStats.safeParse({ ...statsBase, n: "x" }).success).toBe(false);
    expect(esquemaStats.safeParse({ ...statsBase, porEvidencia: [{ ...porEvidencia[0], optima: "tal vez" }] }).success).toBe(false);
  });
  it("valida /api/ranking", () => {
    const ok = { ranking: [{ jugador: "Ana", puntaje: 300, prevalencia: 0.1, creada_en: "2026-01-01T00:00:00.000Z" }] };
    expect(esquemaRanking.safeParse(ok).success).toBe(true);
    const conTiempo = { ranking: [{ ...ok.ranking[0], tiempoTotalMs: 83000 }] };
    expect(esquemaRanking.safeParse(conTiempo).success).toBe(true);
    expect(esquemaRanking.safeParse({ ranking: [{ ...ok.ranking[0], tiempoTotalMs: null }] }).success).toBe(true);
    expect(esquemaRanking.safeParse({ ranking: [{ jugador: 1 }] }).success).toBe(false);
  });
});

describe("esquemaActividad", () => {
  const partida = {
    id: "7d1c2b4e-0000-4000-8000-000000000001",
    jugador: "Ana",
    puntaje: 300,
    creada_en: "2026-10-19T12:00:00.000Z",
    primer_intento: true,
  };

  it("acepta la forma de /api/actividad, también la lista vacía", () => {
    expect(esquemaActividad.safeParse({ actividad: [partida] }).success).toBe(true);
    expect(esquemaActividad.safeParse({ actividad: [] }).success).toBe(true);
  });

  it("rechaza campos faltantes o de tipo incorrecto", () => {
    expect(esquemaActividad.safeParse({ actividad: [{ ...partida, primer_intento: "si" }] }).success).toBe(false);
    expect(esquemaActividad.safeParse({ actividad: [{ jugador: "Ana" }] }).success).toBe(false);
    expect(esquemaActividad.safeParse({}).success).toBe(false);
  });
});

describe("tiempoRelativo", () => {
  const ahora = Date.parse("2026-10-19T12:10:00.000Z");

  it("expresa segundos, minutos, horas y días", () => {
    expect(tiempoRelativo("2026-10-19T12:09:55.000Z", ahora)).toBe("hace 5 s");
    expect(tiempoRelativo("2026-10-19T12:09:00.000Z", ahora)).toBe("hace 1 min");
    expect(tiempoRelativo("2026-10-19T09:10:00.000Z", ahora)).toBe("hace 3 h");
    expect(tiempoRelativo("2026-10-17T12:10:00.000Z", ahora)).toBe("hace 2 d");
  });

  it("no muestra tiempos negativos (desfase de reloj) y no falla con fechas inválidas", () => {
    expect(tiempoRelativo("2026-10-19T12:10:30.000Z", ahora)).toBe("hace 0 s");
    expect(tiempoRelativo("no es fecha", ahora)).toBe("");
  });
});
