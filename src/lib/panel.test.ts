import { describe, expect, it } from "vitest";
import {
  datosHistograma,
  esquemaRanking,
  esquemaStats,
  formatoEntero,
  formatoNumero,
  formatoPct,
  anclajeEtiquetaVpp,
  posicionLineaVpp,
  urlExport,
  urlJuego,
  urlLegible,
} from "./panel";

const cubetas = Array.from({ length: 10 }, (_, i) => ({
  desde: i * 10,
  hasta: i === 9 ? 100 : i * 10 + 9,
  cantidad: 0,
}));

describe("datosHistograma", () => {
  it("etiqueta las 10 cubetas con guion largo y la última 90–100", () => {
    const filas = datosHistograma(cubetas);
    expect(filas).toHaveLength(10);
    expect(filas.map((f) => f.etiqueta)).toEqual([
      "0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100",
    ]);
  });

  it("calcula el porcentaje sobre el total y 0 si no hay respuestas", () => {
    expect(datosHistograma(cubetas).every((f) => f.porcentaje === 0)).toBe(true);
    const con = cubetas.map((c, i) => ({ ...c, cantidad: i === 3 ? 3 : i === 4 ? 1 : 0 }));
    const filas = datosHistograma(con);
    expect(filas[3]).toMatchObject({ cantidad: 3, porcentaje: 75 });
    expect(filas[4].porcentaje).toBe(25);
  });
});

describe("posicionLineaVpp", () => {
  it("ubica 33,3 % dentro de la cubeta 30–39", () => {
    const p = posicionLineaVpp(100 / 3);
    expect(p.indice).toBe(3);
    expect(p.offset).toBeCloseTo(0.333, 2);
    expect(p.posicion).toBeCloseTo(3.333, 2);
  });

  it("ubica 4,35 % dentro de la cubeta 0–9", () => {
    const p = posicionLineaVpp(4.35);
    expect(p.indice).toBe(0);
    expect(p.posicion).toBeCloseTo(0.435, 3);
  });

  it("acota a [0, 10] y trata 100 como el final de la última cubeta", () => {
    expect(posicionLineaVpp(-5).posicion).toBe(0);
    expect(posicionLineaVpp(100)).toMatchObject({ indice: 9, offset: 1, posicion: 10 });
    expect(posicionLineaVpp(250).posicion).toBe(10);
  });
});

describe("anclajeEtiquetaVpp", () => {
  it("la etiqueta crece hacia adentro cerca de los bordes y se centra en el medio", () => {
    expect(anclajeEtiquetaVpp(posicionLineaVpp(4.35).posicion)).toBe("start");
    expect(anclajeEtiquetaVpp(posicionLineaVpp(100 / 3).posicion)).toBe("middle");
    expect(anclajeEtiquetaVpp(posicionLineaVpp(95).posicion)).toBe("end");
  });
});

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
  it("valida /api/stats con datos y sin datos", () => {
    const base = {
      prevalencia: 0.1,
      totalPartidas: 0,
      n: 0,
      estimacionPromedioPct: null,
      vppObservadoPct: null,
      vppTeoricoPct: 33.3,
      pctSobreestiman: null,
      pctAislados: null,
      aisladosSanos: 0,
      liberadosInfectados: 0,
      histograma: cubetas,
    };
    expect(esquemaStats.safeParse(base).success).toBe(true);
    expect(esquemaStats.safeParse({ ...base, totalJugadores: 0 }).success).toBe(true);
    expect(esquemaStats.safeParse({ ...base, n: "x" }).success).toBe(false);
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
