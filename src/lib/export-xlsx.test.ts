import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  aHoraManagua,
  altoFilaTexto,
  bloqueHistograma,
  bloquesExplicativos,
  construirLibro,
  generarXlsx,
  ubicacionHistograma,
  type DatosExport,
  type DificultadExport,
  type FilaRespuestaExport,
} from "./export-xlsx";
import { construirHistograma } from "./ranking";
import { vppBayes } from "./stats";

function dificultad(prevalencia: number, nombre: string, extra: Partial<DificultadExport> = {}): DificultadExport {
  return {
    prevalencia,
    nombre,
    partidas: 3,
    jugadores: 2,
    estimacionPromedioPct: 40,
    vppObservadoPct: 30,
    vppTeoricoPct: vppBayes(prevalencia) * 100,
    pctSobreestiman: 70,
    histograma: construirHistograma([5, 35, 35, 80]),
    ranking: [
      { jugador: "Ana", puntaje: 300, tiempoTotalMs: 83_000, creadaEn: new Date("2026-05-01T15:00:00Z") },
      { jugador: "Beto", puntaje: 280, tiempoTotalMs: 60_000, creadaEn: new Date("2026-05-01T15:05:00Z") },
      { jugador: "Cami", puntaje: 250, tiempoTotalMs: 61_000, creadaEn: new Date("2026-05-01T15:06:00Z") },
      { jugador: "Dani", puntaje: 200, tiempoTotalMs: null, creadaEn: new Date("2026-05-01T15:07:00Z") },
    ],
    ...extra,
  };
}

function respuesta(extra: Partial<FilaRespuestaExport> = {}): FilaRespuestaExport {
  return {
    partidaId: "11111111-1111-4111-8111-111111111111",
    creadaEn: new Date("2026-05-01T15:00:00Z"),
    jugador: "Ana",
    prevalencia: 0.1,
    puntaje: 300,
    tiempoTotalMs: 83_000,
    primerIntento: true,
    orden: 1,
    estimacionPct: 30,
    decision: "aislar",
    estabaInfectado: true,
    tiempoMs: 4_500,
    ...extra,
  };
}

const datos: DatosExport = {
  generadoEn: new Date("2026-05-02T12:00:00Z"),
  dificultades: [dificultad(0.1, "Normal"), dificultad(0.01, "Experto")],
  respuestas: [
    respuesta(),
    respuesta({ orden: 2, decision: "liberar", estabaInfectado: true }),
    respuesta({ orden: 3, decision: "liberar", estabaInfectado: false, primerIntento: false, jugador: "=SUM(A1)" }),
  ],
};

async function recargar(d: DatosExport = datos): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await generarXlsx(d)) as unknown as ExcelJS.Buffer);
  return wb;
}

describe("libro Excel", () => {
  it("tiene las cuatro hojas y el creador", async () => {
    const wb = await recargar();
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Resumen", "Ranking", "Histograma", "Respuestas"]);
    expect(wb.creator).toBe("Alerta Roja");
  });

  it("Resumen: cifras con formato porcentual, sin cuadrícula y textos explicativos combinados", async () => {
    const ws = (await recargar()).getWorksheet("Resumen")!;
    expect(ws.views[0].showGridLines).toBe(false);
    expect(ws.getRow(4).values).toEqual([undefined, "Métrica", "Normal 10 %", "Experto 1 %"]);
    const teorico = ws.getCell("B9");
    expect(teorico.value).toBeCloseTo(vppBayes(0.1), 6);
    expect(teorico.numFmt).toBe("0.0%");
    expect(ws.getCell("C9").value).toBeCloseTo(vppBayes(0.01), 6);
    expect(ws.getCell("B5").value).toBe(3);
    expect(ws.getCell("B6").value).toBe(2);
    // Cada texto explicativo va en una celda combinada A:C con ajuste de línea.
    for (const b of bloquesExplicativos()) {
      let hallada: ExcelJS.Cell | undefined;
      ws.eachRow((row) => {
        if (row.getCell(1).value === b.texto) hallada = row.getCell(1);
      });
      expect(hallada, b.titulo).toBeDefined();
      expect(hallada!.alignment?.wrapText).toBe(true);
      expect(hallada!.isMerged).toBe(true);
    }
  });

  it("explica las métricas y el gráfico", () => {
    const titulos = bloquesExplicativos().map((b) => b.titulo.toLowerCase()).join("|");
    for (const clave of ["alerta roja", "estimación promedio", "vpp", "sobreestim", "primer intento", "gráfico"]) {
      expect(titulos).toContain(clave);
    }
    expect(altoFilaTexto("x".repeat(180), 90)).toBeGreaterThan(altoFilaTexto("x", 90));
  });

  it("Ranking: una fila por puesto, tiempo m:ss, podio resaltado, cabecera congelada y autofiltro", async () => {
    const ws = (await recargar()).getWorksheet("Ranking")!;
    expect(ws.rowCount).toBe(1 + 4 + 4);
    expect(ws.getRow(1).values).toEqual([
      undefined,
      "Dificultad",
      "Posición",
      "Jugador",
      "Puntaje",
      "Tiempo total (m:ss)",
      "Fecha (hora Managua)",
    ]);
    expect(ws.getCell("C2").value).toBe("Ana");
    expect(ws.getCell("E2").value).toBe("1:23");
    expect(ws.getCell("E5").value).toBe("—");
    expect(ws.getCell("B6").value).toBe(1); // primer puesto de Experto
    expect(ws.getCell("A2").font?.bold).toBe(true);
    expect((ws.getCell("A2").fill as ExcelJS.FillPattern).fgColor?.argb).not.toBe(
      (ws.getCell("A5").fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb,
    );
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(JSON.stringify(ws.autoFilter)).toMatch(/A1:F9|"row":1/);
  });

  it("Respuestas: tipos, formatos y textos Sí/No", async () => {
    const ws = (await recargar()).getWorksheet("Respuestas")!;
    expect(ws.rowCount).toBe(4);
    expect(ws.getRow(1).values).toEqual([
      undefined,
      "ID partida",
      "Fecha (hora Managua)",
      "Jugador",
      "Prevalencia",
      "Primer intento",
      "Puntaje",
      "Tiempo total partida (ms)",
      "Orden",
      "Estimación (%)",
      "Infectado",
      "Decisión",
      "Acierto de decisión",
      "Tiempo respuesta (ms)",
    ]);
    const fecha = ws.getCell("B2");
    expect(fecha.value).toBeInstanceOf(Date);
    expect(fecha.numFmt).toBe("dd/mm/yyyy hh:mm:ss");
    // 15:00 UTC = 09:00 en Managua.
    expect((fecha.value as Date).toISOString()).toBe(aHoraManagua(new Date("2026-05-01T15:00:00Z")).toISOString());
    expect((fecha.value as Date).getUTCHours()).toBe(9);
    expect(ws.getCell("D2").value).toBe(0.1);
    expect(ws.getCell("D2").numFmt).toBe("0%");
    for (const c of ["F2", "G2", "H2", "I2", "M2"]) expect(typeof ws.getCell(c).value).toBe("number");
    expect([ws.getCell("E2").value, ws.getCell("J2").value, ws.getCell("K2").value, ws.getCell("L2").value]).toEqual([
      "Sí",
      "Sí",
      "Aislar",
      "Sí",
    ]);
    // Liberar a un infectado = decisión equivocada; liberar a un sano = acertada.
    expect([ws.getCell("K3").value, ws.getCell("L3").value]).toEqual(["Liberar", "No"]);
    expect([ws.getCell("E4").value, ws.getCell("J4").value, ws.getCell("L4").value]).toEqual(["No", "No", "Sí"]);
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(JSON.stringify(ws.autoFilter)).toMatch(/A1:M4|"row":1/);
  });

  it("un apodo que parece fórmula queda como texto", async () => {
    const ws = (await recargar()).getWorksheet("Respuestas")!;
    const c = ws.getCell("C4");
    expect(c.value).toBe("=SUM(A1)");
    expect(c.type).toBe(ExcelJS.ValueType.String);
  });

  it("sin datos igual produce un libro válido", async () => {
    const vacio: DatosExport = {
      generadoEn: datos.generadoEn,
      respuestas: [],
      dificultades: [
        dificultad(0.1, "Normal", { ranking: [], histograma: construirHistograma([]), estimacionPromedioPct: null }),
        dificultad(0.01, "Experto", { ranking: [], histograma: construirHistograma([]) }),
      ],
    };
    const wb = await recargar(vacio);
    expect(wb.getWorksheet("Respuestas")!.rowCount).toBe(1);
    expect(wb.getWorksheet("Ranking")!.rowCount).toBe(1);
  });
});

describe("histograma", () => {
  it("bloqueHistograma marca el tramo del VPP teórico y calcula fracciones", () => {
    const d = dificultad(0.1, "Normal");
    const filas = bloqueHistograma(d);
    expect(filas).toHaveLength(10);
    expect(filas.filter((f) => f.contieneVpp).map((f) => f.rango)).toEqual(["30–39"]); // 33,3 %
    expect(filas[3].cantidad).toBe(2);
    expect(filas[3].fraccion).toBeCloseTo(0.5);
    expect(bloqueHistograma(dificultad(0.01, "Experto")).find((f) => f.contieneVpp)!.rango).toBe("0–9"); // 4,3 %
    expect(bloqueHistograma({ histograma: construirHistograma([]), vppTeoricoPct: 33 }).every((f) => f.fraccion === 0)).toBe(
      true,
    );
  });

  it("ubicacionHistograma es estable y no se solapa", () => {
    const a = ubicacionHistograma(0);
    const b = ubicacionHistograma(1);
    expect(a.ultimaFila - a.primeraFila).toBe(9);
    expect(b.filaTitulo).toBeGreaterThan(a.filaVpp);
  });

  it("la hoja contiene la tabla en la posición declarada", async () => {
    const ws = (await recargar()).getWorksheet("Histograma")!;
    for (const [idx, d] of datos.dificultades.entries()) {
      const u = ubicacionHistograma(idx);
      expect(ws.getCell(u.filaCabecera, u.colRango).value).toBe("Rango (%)");
      expect(ws.getCell(u.primeraFila, u.colRango).value).toBe("0–9");
      expect(ws.getCell(u.ultimaFila, u.colRango).value).toBe("90–100");
      expect(ws.getCell(u.primeraFila, u.colCantidad).value).toBe(1);
      expect(ws.getCell(u.filaVpp, u.colCantidad).value).toBeCloseTo(Math.round(d.vppTeoricoPct * 10) / 10, 5);
    }
  });

  it("construirLibro devuelve el libro sin serializar", () => {
    expect(construirLibro(datos).worksheets).toHaveLength(4);
  });
});
