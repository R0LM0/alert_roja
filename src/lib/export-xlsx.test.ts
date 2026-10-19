import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { construirDificultad } from "./export-datos";
import {
  HOJA_DECISIONES,
  HOJA_EXPLICACION,
  HOJA_HISTOGRAMA,
  HOJA_PODIO,
  HOJA_PORTADA,
  HOJA_RANKING,
  HOJA_RESPUESTAS,
  aHoraManagua,
  altoFilaTexto,
  bloqueHistograma,
  configsDecisiones,
  construirLibro,
  generarXlsx,
  ubicacionDecisiones,
  ubicacionHistograma,
  type DatosExport,
  type FilaRespuestaExport,
} from "./export-xlsx";
import { armarPodio, type FilaPodio } from "./podio";
import { construirHistograma } from "./ranking";
import { PREVALENCIA, PREVALENCIA_EXPERTO } from "./stats";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";

function respuesta(extra: Partial<FilaRespuestaExport> = {}): FilaRespuestaExport {
  return {
    partidaId: P1,
    creadaEn: new Date("2026-10-20T15:00:00Z"),
    jugador: "Ana",
    prevalencia: PREVALENCIA,
    puntaje: 8,
    tiempoTotalMs: 83_000,
    primerIntento: true,
    enInforme: true,
    orden: 1,
    evidencia: "protegido",
    estimacionPct: null,
    decision: "aislar",
    estabaInfectado: false,
    tiempoMs: 4_500,
    ...extra,
  };
}

const respuestas: FilaRespuestaExport[] = [
  respuesta({ orden: 1 }),
  respuesta({ orden: 2 }),
  respuesta({
    partidaId: P2,
    jugador: "Beto",
    creadaEn: new Date("2026-10-20T14:00:00Z"),
    orden: 1,
    evidencia: "conviviente",
    decision: "aislar",
    estabaInfectado: true,
    puntaje: 6,
  }),
  // Segundo intento de Ana: se guarda, pero no cuenta en el informe.
  respuesta({
    partidaId: P3,
    primerIntento: false,
    enInforme: false,
    evidencia: "contacto",
    decision: "liberar",
    estabaInfectado: false,
    jugador: "Ana",
  }),
];

const rankingNormal = [
  { jugador: "Beto", puntaje: 300, tiempoTotalMs: 83_000, creadaEn: new Date("2026-10-20T14:00:00Z") },
  { jugador: "Ana", puntaje: 300, tiempoTotalMs: 83_000, creadaEn: new Date("2026-10-20T15:00:00Z") },
  { jugador: "Cami", puntaje: 250, tiempoTotalMs: 61_000, creadaEn: new Date("2026-10-20T16:00:00Z") },
];

const filasPodio: FilaPodio[] = rankingNormal.map((r) => ({
  jugador: r.jugador,
  prevalencia: PREVALENCIA,
  puntaje: r.puntaje,
  tiempoTotalMs: r.tiempoTotalMs,
  creada_en: r.creadaEn.toISOString(),
  dueno: null,
}));

function datosDePrueba(extra: Partial<DatosExport> = {}): DatosExport {
  return {
    generadoEn: new Date("2026-10-20T18:00:00Z"),
    cierre: null,
    hayEstimaciones: false,
    dificultades: [
      construirDificultad(PREVALENCIA, "Normal", respuestas, rankingNormal, null),
      construirDificultad(PREVALENCIA_EXPERTO, "Experto", [], [], null),
    ],
    podio: armarPodio(filasPodio),
    respuestas,
    ...extra,
  };
}

async function recargar(d: DatosExport = datosDePrueba()): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await generarXlsx(d)) as unknown as ExcelJS.Buffer);
  return wb;
}

/** Primera celda de la hoja cuyo texto (o texto de enlace) coincide. */
function buscar(ws: ExcelJS.Worksheet, texto: string): ExcelJS.Cell | undefined {
  let hallada: ExcelJS.Cell | undefined;
  ws.eachRow((row) => {
    row.eachCell((c) => {
      const v = c.value;
      const t = typeof v === "object" && v !== null && "text" in v ? v.text : v;
      if (!hallada && t === texto) hallada = c;
    });
  });
  return hallada;
}

describe("libro Excel: hojas", () => {
  it("sin estimaciones: Portada, Explicación, Decisiones, Ranking, Podio y Respuestas", async () => {
    const wb = await recargar();
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      HOJA_PORTADA,
      HOJA_EXPLICACION,
      HOJA_DECISIONES,
      HOJA_RANKING,
      HOJA_PODIO,
      HOJA_RESPUESTAS,
    ]);
    expect(wb.creator).toBe("Alerta Roja");
  });

  it("con estimaciones antiguas añade la hoja Histograma", async () => {
    const d = datosDePrueba({ hayEstimaciones: true });
    d.dificultades[0] = construirDificultad(
      PREVALENCIA,
      "Normal",
      [respuesta({ estimacionPct: 35 }), respuesta({ partidaId: P2, jugador: "Beto", estimacionPct: 36 })],
      [],
      null,
    );
    const wb = await recargar(d);
    expect(wb.worksheets.at(-1)!.name).toBe(HOJA_HISTOGRAMA);
    expect(wb.worksheets).toHaveLength(7);
  });

  it("todas las hojas van con encabezado de impresión horizontal y pie de página", async () => {
    const wb = await recargar();
    for (const ws of wb.worksheets) {
      expect(ws.pageSetup.orientation, ws.name).toBe("landscape");
      expect(ws.pageSetup.fitToWidth, ws.name).toBe(1);
      expect(ws.headerFooter.oddFooter, ws.name).toContain("Página");
    }
  });

  it("libro vacío igual es válido", async () => {
    const vacio = datosDePrueba({
      respuestas: [],
      podio: armarPodio([]),
      dificultades: [
        construirDificultad(PREVALENCIA, "Normal", [], [], null),
        construirDificultad(PREVALENCIA_EXPERTO, "Experto", [], [], null),
      ],
    });
    const wb = await recargar(vacio);
    expect(wb.getWorksheet(HOJA_RESPUESTAS)!.rowCount).toBe(1);
    expect(wb.getWorksheet(HOJA_RANKING)!.getCell("A2").value).toBe("Sin partidas en el alcance del informe");
    expect(buscar(wb.getWorksheet(HOJA_DECISIONES)!, "Sin decisiones registradas en esta modalidad todavía.")).toBeDefined();
  });
});

describe("Portada", () => {
  it("título, subtítulo, generación y KPI por modalidad", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_PORTADA)!;
    expect(ws.getCell("B2").value).toBe("Alerta Roja · Informe de la feria");
    expect(ws.getCell("B3").value).toBe("Análisis Estadístico · UNCSM");
    expect(ws.getCell("B4").value).toBe("Generado el 20/10/2026 12:00 (hora de Managua)");
    const partidas = buscar(ws, "Partidas")!;
    expect(ws.getCell(partidas.row + 1, partidas.col).value).toBe(3); // P1, P2 y el segundo intento de Ana
    const jugadores = buscar(ws, "Jugadores únicos")!;
    expect(ws.getCell(jugadores.row + 1, jugadores.col).value).toBe(2);
    const optimas = buscar(ws, "Decisiones óptimas")!;
    // Primer intento: P1 (protegido, aislar: no óptimo x2) y P2 (conviviente, aislar: óptimo).
    expect(ws.getCell(optimas.row + 1, optimas.col).value).toBeCloseTo(1 / 3, 6);
    expect(ws.getCell(optimas.row + 1, optimas.col).numFmt).toBe("0%");
    const puntaje = buscar(ws, "Puntaje promedio")!;
    expect(ws.getCell(puntaje.row + 1, puntaje.col).value).toBe(7);
  });

  it("sin CIERRE_FERIA no muestra línea de cierre; con cierre sí", async () => {
    const sinCierre = (await recargar()).getWorksheet(HOJA_PORTADA)!;
    expect(buscar(sinCierre, "Cierre de la feria")).toBeUndefined();
    const conCierre = (await recargar(datosDePrueba({ cierre: new Date("2026-10-21T00:00:00Z") }))).getWorksheet(HOJA_PORTADA)!;
    expect(String(conCierre.getCell("B5").value)).toContain("Cierre de la feria: 20/10/2026 18:00");
  });

  it("índice con enlaces internos a las hojas", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_PORTADA)!;
    const enlace = buscar(ws, HOJA_EXPLICACION)!;
    expect((enlace.value as ExcelJS.CellHyperlinkValue).hyperlink).toBe("#'Explicación'!A1");
    expect(buscar(ws, HOJA_RESPUESTAS)).toBeDefined();
  });
});

describe("Explicación", () => {
  it("VPP con los números de cada modalidad y frase de 1 de cada N", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_EXPLICACION)!;
    const vpp = buscar(ws, "VPP: P(enfermo | positivo)")!;
    expect(ws.getCell(vpp.row, 2).value).toBeCloseTo(1 / 3, 6);
    expect(ws.getCell(vpp.row, 3).value).toBeCloseTo(9 / 207, 6);
    expect(ws.getCell(vpp.row, 3).numFmt).toBe("0.0%");
    expect(buscar(ws, "1 de cada 3")).toBeDefined();
    expect(buscar(ws, "1 de cada 23")).toBeDefined();
  });

  it("tabla 2x2 de frecuencias naturales (90/180/10/720 y 9/198/1/792)", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_EXPLICACION)!;
    // Las cabeceras quedan alineadas con sus columnas (A = etiqueta, B = positivo, C = negativo).
    expect(buscar(ws, "Da positivo")!.col).toBe(2);
    expect(buscar(ws, "Da negativo")!.col).toBe(3);
    const enfermo = buscar(ws, "Enfermo")!;
    expect([2, 3].map((c) => ws.getCell(enfermo.row, c).value)).toEqual([90, 10]);
    const sano = buscar(ws, "Sano")!;
    expect([2, 3].map((c) => ws.getCell(sano.row, c).value)).toEqual([180, 720]);
    const frase = [...Array(ws.rowCount).keys()].map((i) => String(ws.getCell(i + 1, 1).value ?? ""));
    expect(frase.some((t) => t.startsWith("VPP = VP ÷ positivos = 90 ÷ 270 = 33,3 %"))).toBe(true);
  });

  it("tabla de evidencias con previo, posterior y óptima derivados de caso-bayesiano", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_EXPLICACION)!;
    const conv = buscar(ws, "Conviviente con caso")!;
    expect(ws.getCell(conv.row, 2).value).toBe(0.4); // previo normal
    expect(ws.getCell(conv.row, 3).value).toBeCloseTo(0.75, 6); // posterior normal
    expect(ws.getCell(conv.row, 4).value).toBe("Aislar");
    expect(ws.getCell(conv.row, 7).value).toBe("Aislar"); // experto: 33 % > 25 %
    const prot = buscar(ws, "Protegido (vacunado o con mascarilla)")!;
    expect(ws.getCell(prot.row, 4).value).toBe("Liberar");
    expect(ws.getCell(prot.row, 7).value).toBe("Liberar");
  });
});

describe("Decisiones", () => {
  it("tabla por evidencia con casos, % que aisló, óptimo y % infectados", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_DECISIONES)!;
    const u = ubicacionDecisiones(0);
    const prot = ws.getRow(u.primeraFila + 4);
    expect(prot.getCell(1).value).toBe("Protegido (vacunado o con mascarilla)");
    expect(prot.getCell(2).value).toBe(2); // casos (primer intento)
    expect(prot.getCell(3).value).toBe(1); // aisló el 100 %
    expect(prot.getCell(4).value).toBe("Liberar");
    expect(prot.getCell(5).value).toBe(0); // ninguna decisión óptima
    expect(prot.getCell(6).value).toBe(0); // infectados observados
    expect(prot.getCell(8).value).toBe(0); // óptimo: 0 % aislar
    const conv = ws.getRow(u.primeraFila);
    expect(conv.getCell(5).value).toBe(1); // aislar a un infectado es óptimo
  });

  it("lectura automática por modalidad con el mayor desvío", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_DECISIONES)!;
    const u = ubicacionDecisiones(0);
    expect(String(ws.getCell(u.filaLectura, 1).value)).toBe(
      "El público aisló de más a los pacientes protegidos (vacunados o con mascarilla): 100 % vs óptimo 0 %.",
    );
    expect(String(ws.getCell(u.filaLectura + 1, 1).value)).toBe("En total, 33 % de las 3 decisiones coincidió con la óptima.");
  });

  it("gráfico por modalidad: configuración con dos series (público y óptimo)", () => {
    const [normal, experto] = configsDecisiones(datosDePrueba());
    expect(normal.series.map((s) => s.nombre)).toEqual(["% que aisló el público", "% que debería aislarse (óptimo)"]);
    expect(normal.categorias).toHaveLength(5);
    expect(normal.series[1].valores).toEqual([1, 1, 1, 1, 0]);
    expect(normal.series[0].valores[4]).toBe(1);
    expect(experto.titulo).toContain("Experto");
  });
});

describe("Ranking y Podio", () => {
  it("Ranking: una fila por puesto, tiempo m:ss y autofiltro", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_RANKING)!;
    expect(ws.getRow(1).values).toEqual([
      undefined,
      "Dificultad",
      "Posición",
      "Jugador",
      "Puntaje",
      "Tiempo total (m:ss)",
      "Fecha (hora Managua)",
    ]);
    expect(ws.getCell("A2").value).toBe("Normal 10 %");
    expect(ws.getCell("C2").value).toBe("Beto");
    expect(ws.getCell("E2").value).toBe("1:23");
    expect(ws.getCell("A2").font?.bold).toBe(true);
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(JSON.stringify(ws.autoFilter)).toMatch(/A1:F4|"row":1/);
  });

  it("Podio: orden por puntaje y tiempo, y empate marcado", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_PODIO)!;
    expect(ws.getCell("B2").value).toBe(1);
    expect(ws.getCell("C2").value).toBe("Beto");
    expect(ws.getCell("C3").value).toBe("Ana");
    expect(ws.getCell("G2").value).toBe("Sí"); // empate con el 2.º
    expect(ws.getCell("G3").value).toBe("Sí");
    expect(ws.getCell("G4").value).toBe("No"); // Cami tiene menos puntaje
    expect(ws.getCell("H2").value).toBe("No"); // sin dueño, no hay aviso de dispositivo
    expect(buscar(ws, "Sin partidas en el alcance del informe")).toBeDefined(); // Experto vacío
  });
});

describe("Respuestas", () => {
  it("tabla de Excel con autofiltro y columnas de decisión óptima", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_RESPUESTAS)!;
    expect(Object.keys((ws as unknown as { tables: Record<string, unknown> }).tables)).toEqual(["TablaRespuestas"]);
    expect(ws.getRow(1).values).toEqual([
      undefined,
      "ID partida",
      "Fecha (hora Managua)",
      "Jugador",
      "Modalidad",
      "Primer intento",
      "En el informe",
      "Puntaje partida",
      "Tiempo total partida (ms)",
      "Orden",
      "Evidencia",
      "Decisión",
      "Decisión óptima",
      "¿Óptima?",
      "Infectado",
      "Tiempo respuesta (ms)",
    ]);
    expect(ws.rowCount).toBe(5);
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  });

  it("filas con evidencia, decisión óptima, formatos y Sí/No", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_RESPUESTAS)!;
    const fecha = ws.getCell("B2");
    expect(fecha.value).toBeInstanceOf(Date);
    expect(fecha.numFmt).toBe("dd/mm/yyyy hh:mm");
    expect((fecha.value as Date).getUTCHours()).toBe(9); // 15:00 UTC = 09:00 en Managua
    // Columnas: D Modalidad, E Primer intento, F En el informe, J Evidencia, K Decisión, L Óptima, M ¿Óptima?, N Infectado, O Tiempo.
    expect([ws.getCell("D2").value, ws.getCell("J2").value, ws.getCell("K2").value, ws.getCell("L2").value]).toEqual([
      "Normal",
      "Protegido (vacunado o con mascarilla)",
      "Aislar",
      "Liberar",
    ]);
    expect([ws.getCell("M2").value, ws.getCell("M3").value]).toEqual(["No", "No"]);
    // Beto: conviviente, aislar a un infectado = decisión óptima.
    expect([ws.getCell("K4").value, ws.getCell("L4").value, ws.getCell("M4").value, ws.getCell("N4").value]).toEqual([
      "Aislar",
      "Aislar",
      "Sí",
      "Sí",
    ]);
    // Segundo intento: no entra al informe.
    expect([ws.getCell("E5").value, ws.getCell("F5").value]).toEqual(["No", "No"]);
    expect(ws.getCell("O2").numFmt).toBe("#,##0");
  });

  it("sin estimaciones no hay columna de estimación", async () => {
    const ws = (await recargar()).getWorksheet(HOJA_RESPUESTAS)!;
    expect(buscar(ws, "Estimación (%)")).toBeUndefined();
  });

  it("un apodo que parece fórmula queda como texto", async () => {
    const d = datosDePrueba({ respuestas: [respuesta({ jugador: "=SUM(A1)" })] });
    const ws = (await recargar(d)).getWorksheet(HOJA_RESPUESTAS)!;
    const c = ws.getCell("C2");
    expect(c.value).toBe("=SUM(A1)");
    expect(c.type).toBe(ExcelJS.ValueType.String);
  });
});

describe("Histograma (solo estimaciones antiguas)", () => {
  it("bloqueHistograma marca el tramo del VPP teórico y calcula fracciones", () => {
    const d = {
      histograma: construirHistograma([5, 35, 35, 80]),
      vppTeoricoPct: 33.3,
    };
    const filas = bloqueHistograma(d);
    expect(filas).toHaveLength(10);
    expect(filas.filter((f) => f.contieneVpp).map((f) => f.rango)).toEqual(["30–39"]);
    expect(filas[3].cantidad).toBe(2);
    expect(filas[3].fraccion).toBeCloseTo(0.5);
  });

  it("ubicacionHistograma es estable y no se solapa", () => {
    const a = ubicacionHistograma(0);
    const b = ubicacionHistograma(1);
    expect(a.ultimaFila - a.primeraFila).toBe(9);
    expect(b.filaTitulo).toBeGreaterThan(a.filaVpp);
  });

  it("la hoja contiene la tabla en la posición declarada", async () => {
    const d = datosDePrueba({ hayEstimaciones: true });
    d.dificultades[0] = construirDificultad(
      PREVALENCIA,
      "Normal",
      [respuesta({ estimacionPct: 35 }), respuesta({ partidaId: P2, jugador: "B", estimacionPct: 36 })],
      [],
      null,
    );
    const ws = (await recargar(d)).getWorksheet(HOJA_HISTOGRAMA)!;
    const u = ubicacionHistograma(0);
    expect(ws.getCell(u.filaCabecera, u.colRango).value).toBe("Rango (%)");
    expect(ws.getCell(u.primeraFila, u.colRango).value).toBe("0–9");
    expect(ws.getCell(u.ultimaFila, u.colRango).value).toBe("90–100");
    expect(ws.getCell(u.primeraFila + 3, u.colCantidad).value).toBe(2);
  });

  it("construirLibro devuelve el libro sin serializar", () => {
    expect(construirLibro(datosDePrueba()).worksheets).toHaveLength(6);
  });
});

describe("utilidades", () => {
  it("aHoraManagua resta 6 horas", () => {
    expect(aHoraManagua(new Date("2026-05-01T15:00:00Z")).toISOString()).toBe("2026-05-01T09:00:00.000Z");
  });

  it("altoFilaTexto crece con el texto", () => {
    expect(altoFilaTexto("x".repeat(180), 90)).toBeGreaterThan(altoFilaTexto("x", 90));
  });
});
