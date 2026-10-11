import ExcelJS from "exceljs";
import type { Cubeta } from "./ranking";
import { formatearTiempoTotal } from "./ranking";
import { decisionAcertada } from "./stats";
import { agregarGraficosSeguro, type ConfigGrafico } from "./export-grafico";

/** Datos planos del Excel: el armado del libro no toca la base ni la red. */
export type FilaRankingExport = {
  jugador: string;
  puntaje: number;
  tiempoTotalMs: number | null;
  creadaEn: Date;
};

export type DificultadExport = {
  prevalencia: number;
  nombre: string;
  partidas: number;
  jugadores: number;
  estimacionPromedioPct: number | null;
  vppObservadoPct: number | null;
  vppTeoricoPct: number;
  pctSobreestiman: number | null;
  /** Solo primeros intentos. */
  histograma: Cubeta[];
  ranking: FilaRankingExport[];
};

export type FilaRespuestaExport = {
  partidaId: string;
  creadaEn: Date;
  jugador: string;
  prevalencia: number;
  puntaje: number;
  tiempoTotalMs: number | null;
  primerIntento: boolean;
  orden: number;
  estimacionPct: number;
  decision: "aislar" | "liberar";
  estabaInfectado: boolean;
  tiempoMs: number;
};

export type DatosExport = {
  generadoEn: Date;
  dificultades: DificultadExport[];
  respuestas: FilaRespuestaExport[];
};

export const HOJA_RESUMEN = "Resumen";
export const HOJA_RANKING = "Ranking";
export const HOJA_HISTOGRAMA = "Histograma";
export const HOJA_RESPUESTAS = "Respuestas";

const FMT_FECHA = "dd/mm/yyyy hh:mm:ss";
const FMT_PCT = "0.0%";
const DESFASE_MANAGUA_MS = -6 * 3600_000;

const COLOR_OSCURO = "FF18181B";
const COLOR_ROJO = "FFDC2626";
const COLOR_BANDA = "FFF4F4F5";
const FILAS_PODIO = ["FFFDE68A", "FFE5E7EB", "FFFDBA74"]; // oro, plata, bronce (suaves)

/** Excel no guarda zona horaria: se escribe la hora de Managua (UTC−6, sin horario de verano) como hora local. */
export function aHoraManagua(d: Date): Date {
  return new Date(d.getTime() + DESFASE_MANAGUA_MS);
}

const sino = (v: boolean) => (v ? "Sí" : "No");
const formatoPrev = (p: number) => `${Math.round(p * 100)} %`;
/** Porcentaje (0–100) a fracción para el formato 0.0 %. */
const pct = (v: number | null) => (v === null ? null : v / 100);
const rellenar = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

/** `columnas` limita el estilo a las primeras N celdas (si no, a toda la fila). */
function estiloCabecera(row: ExcelJS.Row, columnas?: number) {
  const estilo = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: rellenar(COLOR_OSCURO),
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  } as const;
  if (columnas === undefined) Object.assign(row, estilo);
  else for (let c = 1; c <= columnas; c++) Object.assign(row.getCell(c), estilo);
  row.height = 24;
}

/* ------------------------------ Resumen ------------------------------ */

export type BloqueTexto = { titulo: string; texto: string };

/** Textos explicativos del Resumen (español plano). */
export function bloquesExplicativos(): BloqueTexto[] {
  return [
    {
      titulo: "¿Qué es Alerta Roja?",
      texto:
        "Un juego sobre probabilidad. Cada jugador ve 10 pacientes que dieron positivo en una prueba (acierta con el 90 % de los infectados y con el 80 % de los sanos), estima qué probabilidad hay de que de verdad estén infectados y decide si los aísla o los libera. Hay dos dificultades: Normal (10 % de la población infectada) y Experto (1 %).",
    },
    {
      titulo: "Estimación promedio",
      texto: "Promedio de lo que el público creyó: la probabilidad de estar infectado, dado que la prueba salió positiva.",
    },
    {
      titulo: "VPP observado y VPP teórico",
      texto:
        "El VPP (valor predictivo positivo) es el porcentaje de positivos que de verdad están infectados. El teórico se calcula con el teorema de Bayes y es la respuesta correcta; el observado es el porcentaje de pacientes del juego que resultaron infectados, y se acerca al teórico cuando hay muchas respuestas.",
    },
    {
      titulo: "% que sobreestimó",
      texto:
        "Porcentaje de estimaciones por encima del VPP teórico. Un valor alto indica que el público tiende a asustarse de más ante un positivo.",
    },
    {
      titulo: "¿Por qué solo cuenta el primer intento?",
      texto:
        "Al terminar la ronda el jugador conoce el resultado real, así que sus intentos siguientes ya no son comparables. Solo la primera partida de cada apodo y dificultad entra en el ranking y en estas estadísticas; las demás se guardan y aparecen en la hoja Respuestas (columna Primer intento = No).",
    },
    {
      titulo: "Cómo leer el gráfico",
      texto:
        "La hoja Histograma trae, junto a cada tabla, un gráfico de columnas (editable en Excel) con cuántas estimaciones cayeron en cada tramo de 10 puntos (0–9, 10–19… 90–100). La barra oscura es el tramo que contiene el VPP teórico, es decir, la respuesta correcta: si la mayoría de las barras quedan a su derecha, el público sobreestimó el riesgo.",
    },
  ];
}

/** Alto de fila aproximado para texto envuelto en una celda combinada. */
export function altoFilaTexto(texto: string, caracteresPorLinea: number): number {
  return Math.max(1, Math.ceil(texto.length / caracteresPorLinea)) * 15 + 6;
}

function hojaResumen(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_RESUMEN, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 38 }, { width: 24 }, { width: 24 }];

  ws.mergeCells("A1:C1");
  const titulo = ws.getCell("A1");
  titulo.value = "Alerta Roja · Resumen de resultados";
  titulo.font = { size: 18, bold: true, color: { argb: COLOR_ROJO } };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:C2");
  const fecha = aHoraManagua(datos.generadoEn).toISOString().slice(0, 16).replace("T", " ");
  ws.getCell("A2").value = `Generado el ${fecha} (hora de Managua, UTC−6)`;
  ws.getCell("A2").font = { italic: true, color: { argb: "FF52525B" } };

  const cab = ws.getRow(4);
  cab.values = ["Métrica", ...datos.dificultades.map((d) => `${d.nombre} ${formatoPrev(d.prevalencia)}`)];
  estiloCabecera(cab);

  const filas: [string, (d: DificultadExport) => number | null, string][] = [
    ["Partidas totales (todos los intentos)", (d) => d.partidas, "#,##0"],
    ["Jugadores (primer intento)", (d) => d.jugadores, "#,##0"],
    ["Estimación promedio", (d) => pct(d.estimacionPromedioPct), FMT_PCT],
    ["VPP observado", (d) => pct(d.vppObservadoPct), FMT_PCT],
    ["VPP teórico (Bayes)", (d) => pct(d.vppTeoricoPct), FMT_PCT],
    ["% que sobreestimó", (d) => pct(d.pctSobreestiman), FMT_PCT],
  ];
  filas.forEach(([etiqueta, valor, fmt], i) => {
    const row = ws.getRow(5 + i);
    row.getCell(1).value = etiqueta;
    row.getCell(1).font = { bold: true };
    datos.dificultades.forEach((d, j) => {
      const c = row.getCell(2 + j);
      c.value = valor(d);
      c.numFmt = fmt;
      c.alignment = { horizontal: "right" };
    });
    if (i % 2 === 1) row.eachCell((c) => (c.fill = rellenar(COLOR_BANDA)));
  });

  let r = 5 + filas.length + 1;
  ws.getCell(`A${r}`).value = "Cómo leer estos datos";
  ws.getCell(`A${r}`).font = { size: 14, bold: true, color: { argb: COLOR_ROJO } };
  r += 1;
  for (const b of bloquesExplicativos()) {
    ws.getCell(`A${r}`).value = b.titulo;
    ws.getCell(`A${r}`).font = { bold: true };
    r += 1;
    ws.mergeCells(`A${r}:C${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = b.texto;
    c.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(r).height = altoFilaTexto(b.texto, 90);
    r += 2;
  }
}

/* ------------------------------ Ranking ------------------------------ */

/** Una sola tabla (un autofiltro por hoja): la columna Dificultad permite filtrar. */
function hojaRanking(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_RANKING, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Dificultad", width: 14 },
    { header: "Posición", width: 11 },
    { header: "Jugador", width: 26 },
    { header: "Puntaje", width: 11 },
    { header: "Tiempo total (m:ss)", width: 20 },
    { header: "Fecha (hora Managua)", width: 22 },
  ];
  estiloCabecera(ws.getRow(1));

  let fila = 2;
  for (const d of datos.dificultades) {
    d.ranking.forEach((e, i) => {
      const row = ws.getRow(fila++);
      row.getCell(1).value = `${d.nombre} ${formatoPrev(d.prevalencia)}`;
      row.getCell(2).value = i + 1;
      row.getCell(3).value = e.jugador;
      row.getCell(4).value = e.puntaje;
      row.getCell(5).value = formatearTiempoTotal(e.tiempoTotalMs);
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(6).value = aHoraManagua(e.creadaEn);
      row.getCell(6).numFmt = FMT_FECHA;
      if (i < 3) {
        row.font = { bold: true };
        row.eachCell((c) => (c.fill = rellenar(FILAS_PODIO[i])));
      }
    });
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, fila - 1), column: 6 } };
}

/* ----------------------------- Histograma ---------------------------- */

const BLOQUE_HISTOGRAMA = 22;

/** Posición fija de la tabla de cada dificultad, para adjuntar un gráfico después. */
export function ubicacionHistograma(indiceDificultad: number) {
  const titulo = 1 + indiceDificultad * BLOQUE_HISTOGRAMA;
  return {
    hoja: HOJA_HISTOGRAMA,
    filaTitulo: titulo,
    filaCabecera: titulo + 1,
    primeraFila: titulo + 2,
    ultimaFila: titulo + 11,
    filaVpp: titulo + 12,
    filaNota: titulo + 14,
    /** Columnas (1 = A): categorías y valores del gráfico. */
    colRango: 1,
    colCantidad: 4,
  };
}

export type FilaHistograma = {
  rango: string;
  desde: number;
  hasta: number;
  cantidad: number;
  /** Fracción 0–1 del total de estimaciones. */
  fraccion: number;
  contieneVpp: boolean;
};

/** Tabla limpia del histograma de una dificultad (10 tramos) con la marca del VPP teórico. */
export function bloqueHistograma(d: Pick<DificultadExport, "histograma" | "vppTeoricoPct">): FilaHistograma[] {
  const total = d.histograma.reduce((a, c) => a + c.cantidad, 0);
  const indiceVpp = Math.min(9, Math.max(0, Math.floor(d.vppTeoricoPct / 10)));
  return d.histograma.map((c, i) => ({
    rango: `${c.desde}–${c.hasta}`,
    desde: c.desde,
    hasta: c.hasta,
    cantidad: c.cantidad,
    fraccion: total === 0 ? 0 : c.cantidad / total,
    contieneVpp: i === indiceVpp,
  }));
}

function hojaHistograma(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_HISTOGRAMA, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 16 }, { width: 28 }];
  datos.dificultades.forEach((d, idx) => {
    const u = ubicacionHistograma(idx);
    ws.mergeCells(u.filaTitulo, 1, u.filaTitulo, 6);
    const t = ws.getCell(u.filaTitulo, 1);
    t.value = `Estimaciones del público · ${d.nombre} ${formatoPrev(d.prevalencia)} (solo primeros intentos)`;
    t.font = { size: 13, bold: true, color: { argb: COLOR_ROJO } };

    const cab = ws.getRow(u.filaCabecera);
    cab.values = ["Rango (%)", "Desde", "Hasta", "Estimaciones", "% del total", "Marca"];
    estiloCabecera(cab, 6); // el gráfico queda a la derecha: la cabecera no debe cruzarse con él

    bloqueHistograma(d).forEach((f, i) => {
      const row = ws.getRow(u.primeraFila + i);
      row.values = [f.rango, f.desde, f.hasta, f.cantidad, f.fraccion, f.contieneVpp ? "◄ contiene el VPP teórico" : ""];
      row.getCell(5).numFmt = FMT_PCT;
      if (f.contieneVpp) {
        row.eachCell((c) => {
          c.fill = rellenar("FFFEE2E2");
          c.font = { bold: true };
        });
      }
    });

    const vpp = ws.getRow(u.filaVpp);
    vpp.getCell(1).value = "VPP teórico (%)";
    vpp.getCell(1).font = { bold: true };
    vpp.getCell(4).value = Math.round(d.vppTeoricoPct * 10) / 10;
    vpp.getCell(4).numFmt = "0.0";

    const nota = u.filaNota;
    ws.mergeCells(nota, 1, nota, 6);
    const texto = notaHistograma(d);
    const c = ws.getCell(nota, 1);
    c.value = texto;
    c.alignment = { wrapText: true, vertical: "top" };
    c.font = { italic: true, color: { argb: "FF52525B" } };
    ws.getRow(nota).height = altoFilaTexto(texto, 75);
  });
}

/** Texto junto al gráfico: qué son las barras y qué marca la barra oscura. */
export function notaHistograma(d: Pick<DificultadExport, "vppTeoricoPct">): string {
  const vpp = (Math.round(d.vppTeoricoPct * 10) / 10).toString().replace(".", ",");
  return `Cada barra cuenta cuántas estimaciones del público cayeron en un tramo de 10 puntos. La barra oscura es el tramo que contiene el VPP teórico (${vpp} %), la respuesta correcta. Las barras a su derecha son estimaciones por encima de lo correcto (sobreestimación).`;
}

/* ----------------------------- Respuestas ---------------------------- */

const COLUMNAS_RESPUESTAS = [
  { header: "ID partida", width: 38 },
  { header: "Fecha (hora Managua)", width: 22 },
  { header: "Jugador", width: 24 },
  { header: "Prevalencia", width: 13 },
  { header: "Primer intento", width: 15 },
  { header: "Puntaje", width: 10 },
  { header: "Tiempo total partida (ms)", width: 18 },
  { header: "Orden", width: 8 },
  { header: "Estimación (%)", width: 14 },
  { header: "Infectado", width: 11 },
  { header: "Decisión", width: 12 },
  { header: "Acierto de decisión", width: 17 },
  { header: "Tiempo respuesta (ms)", width: 16 },
];

function hojaRespuestas(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_RESPUESTAS, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNAS_RESPUESTAS;
  estiloCabecera(ws.getRow(1));

  datos.respuestas.forEach((f, i) => {
    const acierto = decisionAcertada({
      estimacion_pct: f.estimacionPct,
      decision: f.decision,
      estaba_infectado: f.estabaInfectado,
    });
    // Los textos se escriben como cadenas: exceljs no las evalúa como fórmulas ("=SUM(A1)" queda texto).
    const row = ws.addRow([
      f.partidaId,
      aHoraManagua(f.creadaEn),
      f.jugador,
      f.prevalencia,
      sino(f.primerIntento),
      f.puntaje,
      f.tiempoTotalMs,
      f.orden,
      f.estimacionPct,
      sino(f.estabaInfectado),
      f.decision === "aislar" ? "Aislar" : "Liberar",
      sino(acierto),
      f.tiempoMs,
    ]);
    row.getCell(2).numFmt = FMT_FECHA;
    row.getCell(4).numFmt = "0%";
    if (i % 2 === 1) row.eachCell((c) => (c.fill = rellenar(COLOR_BANDA)));
  });
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, datos.respuestas.length + 1), column: COLUMNAS_RESPUESTAS.length },
  };
}

/* ------------------------------- Libro ------------------------------- */

export function construirLibro(datos: DatosExport): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alerta Roja";
  wb.title = "Alerta Roja · Resultados";
  wb.created = datos.generadoEn;
  hojaResumen(wb, datos);
  hojaRanking(wb, datos);
  hojaHistograma(wb, datos);
  hojaRespuestas(wb, datos);
  return wb;
}

export async function generarXlsx(datos: DatosExport): Promise<Buffer> {
  return Buffer.from(await construirLibro(datos).xlsx.writeBuffer());
}

/* ------------------------------ Gráficos ------------------------------ */

/** Un gráfico de columnas por dificultad, a la derecha de su tabla (columnas H–Q). */
export function configsGraficos(datos: DatosExport): ConfigGrafico[] {
  return datos.dificultades.map((d, idx) => {
    const u = ubicacionHistograma(idx);
    const filas = bloqueHistograma(d);
    const marcada = filas.findIndex((f) => f.contieneVpp);
    return {
      hoja: u.hoja,
      titulo: `Estimaciones del público · ${d.nombre} (${formatoPrev(d.prevalencia)})`,
      tituloEjeX: "Estimación (%)",
      tituloEjeY: "Cantidad de respuestas",
      nombreSerie: "Estimaciones",
      filaSerie: u.filaCabecera,
      colSerie: u.colCantidad,
      primeraFila: u.primeraFila,
      ultimaFila: u.ultimaFila,
      colCategorias: u.colRango,
      colValores: u.colCantidad,
      categorias: filas.map((f) => f.rango),
      valores: filas.map((f) => f.cantidad),
      indiceMarcado: marcada >= 0 ? marcada : null,
      desde: { col: 7, fila: u.filaTitulo - 1 },
      hasta: { col: 17, fila: u.filaTitulo - 1 + 19 },
    };
  });
}

/** Excel con gráficos nativos; si el post-proceso falla, devuelve el libro sin gráficos. */
export async function generarXlsxConGraficos(
  datos: DatosExport,
  alFallar: (e: unknown) => void = () => {},
): Promise<Buffer> {
  return agregarGraficosSeguro(await generarXlsx(datos), configsGraficos(datos), alFallar);
}
