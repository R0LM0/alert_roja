import ExcelJS from "exceljs";
import { EVIDENCIAS, posteriorBayes, type Evidencia, type ModalidadCaso } from "./caso-bayesiano";
import {
  decisionOptima,
  formatearPct,
  frecuenciasDeModo,
  modoDePrevalencia,
  nombreModo,
  textoUmbral,
  EVIDENCIAS_ORDEN,
  type FilaEvidencia,
} from "./export-decisiones";
import { agregarGraficosSeguro, COLOR_OSCURO_GRAFICO, COLOR_ROJO_GRAFICO, type ConfigGrafico } from "./export-grafico";
import { ETIQUETA_TEMPORADA_ACTUAL, formatearTiempoTotal, type Cubeta } from "./ranking";
import type { Podio, Puesto } from "./podio";
import { ESPECIFICIDAD, PREVALENCIA, PREVALENCIA_EXPERTO, SENSIBILIDAD, vppBayes } from "./stats";

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
  /** Partidas del alcance del informe (todos los intentos). */
  partidas: number;
  /** Jugadores: primer intento de cada apodo. */
  jugadores: number;
  puntajePromedio: number | null;
  vppTeoricoPct: number;
  /** Por evidencia; solo primeros intentos dentro del alcance. */
  decisiones: FilaEvidencia[];
  totalCasos: number;
  /** Fracciones 0–1; null sin decisiones. */
  pctAisloTotal: number | null;
  pctOptimasTotal: number | null;
  /** Lectura automática (1–2 líneas). */
  lecturas: string[];
  /** Solo para estimaciones antiguas (hoja Histograma). */
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
  /** Cuenta en el informe: primer intento y dentro del alcance (temporada y cierre). */
  enInforme: boolean;
  orden: number;
  evidencia: Evidencia | null;
  estimacionPct: number | null;
  decision: "aislar" | "liberar";
  estabaInfectado: boolean;
  tiempoMs: number;
};

export type DatosExport = {
  generadoEn: Date;
  /** CIERRE_FERIA ya interpretada, o null. */
  cierre: Date | null;
  /** Hay estimaciones antiguas dentro del alcance: solo entonces se incluye la hoja Histograma. */
  hayEstimaciones: boolean;
  dificultades: DificultadExport[];
  podio: Podio;
  respuestas: FilaRespuestaExport[];
};

export const HOJA_PORTADA = "Portada";
export const HOJA_EXPLICACION = "Explicación";
export const HOJA_DECISIONES = "Decisiones";
export const HOJA_RANKING = "Ranking";
export const HOJA_PODIO = "Podio";
export const HOJA_RESPUESTAS = "Respuestas";
export const HOJA_HISTOGRAMA = "Histograma";

const TITULO_INFORME = "Alerta Roja · Informe de la feria";
const FMT_FECHA = "dd/mm/yyyy hh:mm";
const FMT_PCT = "0.0%";
const FMT_ENTERO = "#,##0";
const DESFASE_MANAGUA_MS = -6 * 3600_000;

const COLOR_OSCURO = "FF18181B";
const COLOR_ROJO = "FFDC2626";
const COLOR_TEXTO_SUAVE = "FF52525B";
const COLOR_BANDA = "FFF4F4F5";
const COLOR_ROJO_SUAVE = "FFFEE2E2";
const FILAS_PODIO = [COLOR_ROJO_SUAVE, "FFE4E4E7", "FFE4E4E7"]; // 1.º acento rojo suave; 2.º y 3.º gris

/** Excel no guarda zona horaria: se escribe la hora de Managua (UTC−6, sin horario de verano) como hora local. */
export function aHoraManagua(d: Date): Date {
  return new Date(d.getTime() + DESFASE_MANAGUA_MS);
}

/** "19/10/2026 14:31" en hora de Managua, para texto. */
export function fechaHoraManagua(d: Date): string {
  const m = aHoraManagua(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(m.getUTCDate())}/${p(m.getUTCMonth() + 1)}/${m.getUTCFullYear()} ${p(m.getUTCHours())}:${p(m.getUTCMinutes())}`;
}

const sino = (v: boolean) => (v ? "Sí" : "No");
const rellenar = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const fuenteSuave = { italic: true, color: { argb: COLOR_TEXTO_SUAVE } } as const;

/** `columnas` limita el estilo a las primeras N celdas (si no, a toda la fila). */
function estiloCabecera(row: ExcelJS.Row, columnas?: number) {
  const estilo = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: rellenar(COLOR_OSCURO),
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  } as const;
  if (columnas === undefined) Object.assign(row, estilo);
  else for (let c = 1; c <= columnas; c++) Object.assign(row.getCell(c), estilo);
  row.height = 30;
}

/** Alto de fila aproximado para texto envuelto en una celda combinada. */
export function altoFilaTexto(texto: string, caracteresPorLinea: number): number {
  return Math.max(1, Math.ceil(texto.length / caracteresPorLinea)) * 15 + 6;
}

/** Texto de párrafo en una fila combinada A:última columna, con ajuste de línea. */
function parrafo(ws: ExcelJS.Worksheet, fila: number, ultimaCol: number, texto: string, caracteres: number, estilo?: Partial<ExcelJS.Font>) {
  ws.mergeCells(fila, 1, fila, ultimaCol);
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.alignment = { wrapText: true, vertical: "top" };
  if (estilo) c.font = estilo;
  ws.getRow(fila).height = altoFilaTexto(texto, caracteres);
}

function encabezadoSeccion(ws: ExcelJS.Worksheet, fila: number, ultimaCol: number, texto: string) {
  ws.mergeCells(fila, 1, fila, ultimaCol);
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { size: 13, bold: true, color: { argb: COLOR_ROJO } };
  c.border = { bottom: { style: "thin", color: { argb: COLOR_ROJO } } };
  ws.getRow(fila).height = 24;
}

/** Impresión: horizontal, ancho de una hoja, encabezado con el título y pie con número de página. */
function configurarImpresion(ws: ExcelJS.Worksheet, nombreHoja: string) {
  ws.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  ws.headerFooter = {
    oddHeader: `&L&9${TITULO_INFORME}&R&9${nombreHoja}`,
    oddFooter: "&L&9Hora de Managua (UTC−6)&R&9Página &P de &N",
  };
}

/* ------------------------------ Portada ------------------------------ */

function hojaPortada(wb: ExcelJS.Workbook, datos: DatosExport, hayHistograma: boolean) {
  const ws = wb.addWorksheet(HOJA_PORTADA, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 3 }, { width: 26 }, { width: 26 }, { width: 26 }, { width: 26 }];
  const ultima = 5;

  ws.mergeCells(2, 2, 2, ultima);
  ws.getCell("B2").value = TITULO_INFORME;
  ws.getCell("B2").font = { size: 26, bold: true, color: { argb: COLOR_ROJO } };
  ws.getRow(2).height = 44;

  ws.mergeCells(3, 2, 3, ultima);
  ws.getCell("B3").value = "Análisis Estadístico · UNCSM";
  ws.getCell("B3").font = { size: 13, color: { argb: COLOR_TEXTO_SUAVE } };

  ws.mergeCells(4, 2, 4, ultima);
  ws.getCell("B4").value = `Generado el ${fechaHoraManagua(datos.generadoEn)} (hora de Managua)`;
  ws.getCell("B4").font = fuenteSuave;

  if (datos.cierre) {
    ws.mergeCells(5, 2, 5, ultima);
    ws.getCell("B5").value = `Cierre de la feria: ${fechaHoraManagua(datos.cierre)} (hora de Managua). Lo jugado después no cuenta.`;
    ws.getCell("B5").font = fuenteSuave;
  }

  encabezadoSeccion(ws, 7, ultima, "Indicadores clave");
  ws.mergeCells(8, 2, 8, ultima);
  ws.getCell("B8").value = ETIQUETA_TEMPORADA_ACTUAL;
  ws.getCell("B8").font = fuenteSuave;

  let fila = 10;
  for (const d of datos.dificultades) {
    ws.mergeCells(fila, 2, fila, ultima);
    const titulo = ws.getCell(fila, 2);
    titulo.value = `${nombreModo(modoDePrevalencia(d.prevalencia))} · prevalencia ${Math.round(d.prevalencia * 100)} %`;
    titulo.font = { size: 14, bold: true };
    ws.getRow(fila).height = 22;

    const etiquetas = ["Partidas", "Jugadores únicos", "Decisiones óptimas", "Puntaje promedio"];
    const valores: [number, string][] = [
      [d.partidas, FMT_ENTERO],
      [d.jugadores, FMT_ENTERO],
      [d.pctOptimasTotal ?? Number.NaN, "0%"],
      [d.puntajePromedio ?? Number.NaN, "0.0"],
    ];
    etiquetas.forEach((texto, i) => {
      const c = ws.getCell(fila + 1, 2 + i);
      c.value = texto;
      c.font = { size: 10, bold: true, color: { argb: COLOR_TEXTO_SUAVE } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.fill = rellenar(COLOR_BANDA);
    });
    valores.forEach(([v, fmt], i) => {
      const c = ws.getCell(fila + 2, 2 + i);
      c.value = Number.isNaN(v) ? "—" : v;
      c.numFmt = fmt;
      c.font = { size: 24, bold: true, color: { argb: i === 2 ? COLOR_ROJO : COLOR_OSCURO } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.getRow(fila + 1).height = 30;
    ws.getRow(fila + 2).height = 46;
    fila += 4;
  }

  encabezadoSeccion(ws, fila, ultima, "Índice de hojas");
  fila += 1;
  const indice: [string, string][] = [
    [HOJA_EXPLICACION, "El experimento, el teorema de Bayes y cómo se calcula el puntaje."],
    [HOJA_DECISIONES, "Qué decidió el público con cada evidencia, frente a la decisión óptima. Incluye gráfico."],
    [HOJA_RANKING, "Mejores puntajes por modalidad, con la regla del primer intento y el cierre."],
    [HOJA_PODIO, "Top 3 por modalidad, con avisos de empate."],
    [HOJA_RESPUESTAS, "Una fila por paciente, con evidencia, decisión, decisión óptima y filtros."],
  ];
  if (hayHistograma) indice.push([HOJA_HISTOGRAMA, "Estimaciones de partidas antiguas (solo existe si hay)."]);
  for (const [hoja, descripcion] of indice) {
    const enlace = ws.getCell(fila, 2);
    enlace.value = { text: hoja, hyperlink: `#'${hoja}'!A1`, tooltip: `Ir a ${hoja}` };
    enlace.font = { bold: true, underline: true, color: { argb: COLOR_ROJO } };
    ws.mergeCells(fila, 3, fila, ultima);
    ws.getCell(fila, 3).value = descripcion;
    fila += 1;
  }

  fila += 1;
  parrafo(
    ws,
    fila,
    ultima,
    "Cómo leer las cifras: solo cuenta el primer intento de cada apodo y modalidad, dentro de la temporada actual y hasta el cierre. Los intentos siguientes aparecen en Respuestas, con la columna En el informe en No.",
    95,
    fuenteSuave,
  );
  configurarImpresion(ws, HOJA_PORTADA);
}

/* ---------------------------- Explicación ---------------------------- */

function filaTablaCabecera(ws: ExcelJS.Worksheet, fila: number, valores: string[]) {
  const row = ws.getRow(fila);
  row.values = valores; // setter 0-based: la primera celda es A
  estiloCabecera(row, valores.length);
}

function hojaExplicacion(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(HOJA_EXPLICACION, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  const u = 7;
  const CAR = 115;

  ws.mergeCells(1, 1, 1, u);
  ws.getCell("A1").value = "Cómo leer este informe";
  ws.getCell("A1").font = { size: 18, bold: true, color: { argb: COLOR_ROJO } };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, u);
  ws.getCell("A2").value = "El experimento, el teorema de Bayes y el puntaje, con los números de cada modalidad";
  ws.getCell("A2").font = fuenteSuave;

  let f = 4;
  encabezadoSeccion(ws, f++, u, "1. El experimento");
  parrafo(
    ws,
    f++,
    u,
    "Alerta Roja simula un brote en una ciudad de 1000 personas. Una prueba de laboratorio acierta el 90 % de los infectados (sensibilidad) y da negativo al 80 % de los sanos (especificidad). Cada jugador recibe 10 pacientes que dieron positivo y, por cada uno, ve una evidencia clínica (por ejemplo, si convivió con un caso). Decide si lo aísla o lo libera. Hay dos modalidades: Normal (10 % de la población infectada) y Experto (1 %).",
    CAR,
  );
  parrafo(
    ws,
    f++,
    u,
    "La evidencia cambia la probabilidad antes del test (el previo). La prueba positiva la actualiza con el teorema de Bayes (el posterior). El jugador no ve el posterior: debe decidir con la evidencia y el resultado del test.",
    CAR,
  );

  f += 1;
  encabezadoSeccion(ws, f++, u, "2. El teorema de Bayes");
  parrafo(
    ws,
    f++,
    u,
    "P(enfermo | positivo) = sensibilidad × prevalencia ÷ [sensibilidad × prevalencia + (1 − especificidad) × (1 − prevalencia)]",
    CAR,
    { bold: true },
  );
  filaTablaCabecera(ws, f++, ["Con los números del juego", "Normal", "Experto"]);
  const modos: ModalidadCaso[] = ["normal", "experto"];
  const prevs = [PREVALENCIA, PREVALENCIA_EXPERTO];
  const filasParametros: [string, number[], string][] = [
    ["Prevalencia (infectados en la ciudad)", prevs, "0%"],
    ["Sensibilidad (positivo si está enfermo)", [SENSIBILIDAD, SENSIBILIDAD], "0%"],
    ["Especificidad (negativo si está sano)", [ESPECIFICIDAD, ESPECIFICIDAD], "0%"],
    ["VPP: P(enfermo | positivo)", prevs.map((p) => vppBayes(p)), FMT_PCT],
  ];
  for (const [etiqueta, valores, fmt] of filasParametros) {
    const row = ws.getRow(f++);
    row.getCell(1).value = etiqueta;
    row.getCell(1).font = { bold: true };
    valores.forEach((v, i) => {
      row.getCell(2 + i).value = v;
      row.getCell(2 + i).numFmt = fmt;
      row.getCell(2 + i).alignment = { horizontal: "right" };
    });
  }
  const lecturaVpp = ws.getRow(f++);
  lecturaVpp.getCell(1).value = "Enfermos entre los positivos";
  lecturaVpp.getCell(1).font = { bold: true };
  prevs.forEach((p, i) => {
    lecturaVpp.getCell(2 + i).value = `1 de cada ${Math.round(1 / vppBayes(p))}`;
    lecturaVpp.getCell(2 + i).alignment = { horizontal: "right" };
  });
  parrafo(
    ws,
    f++,
    u,
    "Aunque la prueba acierte el 90 %, la mayoría de los positivos son sanos: hay muchísimos más sanos que enfermos, y sus falsos positivos pesan más que los aciertos. Por eso el VPP es tan bajo, sobre todo en Experto.",
    CAR,
  );

  f += 1;
  encabezadoSeccion(ws, f++, u, "3. Tablas de frecuencias naturales (1000 personas)");
  for (const modo of modos) {
    const fr = frecuenciasDeModo(modo);
    const positivos = fr.vp + fr.fp;
    const negativos = fr.fn + fr.vn;
    const enfermos = fr.vp + fr.fn;
    const sanos = fr.fp + fr.vn;
    filaTablaCabecera(ws, f++, [`${nombreModo(modo)} · prevalencia ${Math.round(fr.prevalencia * 100)} %`, "Da positivo", "Da negativo", "Total"]);
    const filas: [string, number[]][] = [
      ["Enfermo", [fr.vp, fr.fn, enfermos]],
      ["Sano", [fr.fp, fr.vn, sanos]],
      ["Total", [positivos, negativos, positivos + negativos]],
    ];
    for (const [etiqueta, valores] of filas) {
      const row = ws.getRow(f++);
      row.getCell(1).value = etiqueta;
      row.getCell(1).font = { bold: etiqueta === "Total" };
      valores.forEach((v, i) => {
        row.getCell(2 + i).value = v;
        row.getCell(2 + i).numFmt = FMT_ENTERO;
        row.getCell(2 + i).alignment = { horizontal: "right" };
        if (etiqueta === "Total" || i === 2) row.getCell(2 + i).font = { bold: true };
      });
    }
    parrafo(
      ws,
      f++,
      u,
      `VPP = VP ÷ positivos = ${fr.vp} ÷ ${positivos} = ${formatearPct(fr.vp / positivos)}: de los ${positivos} que dan positivo, ${fr.vp} están enfermos.`,
      CAR,
      { bold: true },
    );
    f += 1;
  }
  parrafo(ws, f++, u, "VP: enfermo con positivo. FN: enfermo con negativo. FP: sano con positivo. VN: sano con negativo.", CAR, fuenteSuave);

  f += 1;
  encabezadoSeccion(ws, f++, u, "4. Evidencia, probabilidad y decisión óptima");
  filaTablaCabecera(ws, f++, [
    "Evidencia",
    "Previo normal",
    "Posterior normal",
    "Óptima normal",
    "Previo experto",
    "Posterior experto",
    "Óptima experto",
  ]);
  for (const ev of EVIDENCIAS_ORDEN) {
    const row = ws.getRow(f++);
    row.getCell(1).value = EVIDENCIAS[ev].etiqueta;
    row.getCell(1).font = { bold: true };
    modos.forEach((modo, i) => {
      const previo = EVIDENCIAS[ev].previo[modo];
      const posterior = posteriorBayes(previo);
      const base = 2 + i * 3;
      row.getCell(base).value = previo;
      row.getCell(base).numFmt = FMT_PCT;
      row.getCell(base + 1).value = posterior;
      row.getCell(base + 1).numFmt = FMT_PCT;
      row.getCell(base + 2).value = decisionOptima(ev, modo) === "aislar" ? "Aislar" : "Liberar";
      row.getCell(base + 2).font = { bold: true, color: { argb: COLOR_ROJO } };
      for (let c = base; c <= base + 2; c++) row.getCell(c).alignment = { horizontal: "center" };
    });
  }
  parrafo(
    ws,
    f++,
    u,
    "Previo: probabilidad de infección antes del test, según la evidencia. Posterior: probabilidad después de un positivo (Bayes). Óptima: la decisión de mayor valor esperado para ese posterior.",
    CAR,
    fuenteSuave,
  );
  parrafo(ws, f++, u, textoUmbral(), CAR);

  f += 1;
  encabezadoSeccion(ws, f++, u, "5. Cómo se calcula el puntaje");
  for (const texto of [
    "Cada paciente vale 1 punto si la decisión coincide con la de mayor valor esperado (la óptima de la tabla anterior). Una partida tiene 10 pacientes: máximo 10 puntos.",
    "El ranking ordena por puntaje. En empate gana quien tuvo menor tiempo total y, si sigue el empate, quien jugó primero.",
    "Solo cuenta el primer intento de cada apodo y modalidad. Los intentos siguientes se guardan, pero no entran al ranking, al podio ni a las cifras.",
    "Las partidas cuentan desde el inicio de la temporada actual y hasta la hora de cierre de la feria, si se definió.",
  ]) {
    parrafo(ws, f++, u, `• ${texto}`, CAR);
  }

  f += 1;
  encabezadoSeccion(ws, f++, u, "Glosario");
  const glosario: [string, string][] = [
    ["Prevalencia", "Proporción de la ciudad que está infectada."],
    ["Sensibilidad", "Probabilidad de dar positivo si la persona está enferma (90 %)."],
    ["Especificidad", "Probabilidad de dar negativo si la persona está sana (80 %)."],
    ["VPP", "Valor predictivo positivo: probabilidad de estar enfermo si el test dio positivo."],
    ["Previo", "Probabilidad de infección antes del test, según la evidencia clínica."],
    ["Posterior", "Probabilidad de infección después del test positivo (teorema de Bayes)."],
    ["Decisión óptima", "La acción (aislar o liberar) de mayor valor esperado para el posterior."],
  ];
  for (const [termino, definicion] of glosario) {
    const row = ws.getRow(f);
    row.getCell(1).value = termino;
    row.getCell(1).font = { bold: true };
    ws.mergeCells(f, 2, f, u);
    row.getCell(2).value = definicion;
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = altoFilaTexto(definicion, 95);
    f += 1;
  }
  configurarImpresion(ws, HOJA_EXPLICACION);
}

/* ------------------------------ Decisiones ---------------------------- */

const BLOQUE_DECISIONES = 20;
const COL_CHART_DESDE = 9; // J (0-based)
const COL_CHART_HASTA = 18;

/** Posición fija de la tabla de decisiones de cada modalidad (filas 1-based, columnas 1 = A). */
export function ubicacionDecisiones(indice: number) {
  const titulo = 4 + indice * BLOQUE_DECISIONES;
  return {
    filaTitulo: titulo,
    filaCabecera: titulo + 1,
    primeraFila: titulo + 2,
    ultimaFila: titulo + 1 + EVIDENCIAS_ORDEN.length,
    filaTotal: titulo + 2 + EVIDENCIAS_ORDEN.length,
    filaLectura: titulo + 4 + EVIDENCIAS_ORDEN.length,
    /** Columnas (1 = A): B casos, C % aisló el público, H % óptimo (para el gráfico). */
    colCasos: 2,
    colAislo: 3,
    colOptimo: 8,
  };
}

function hojaDecisiones(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_DECISIONES, { views: [{ showGridLines: false }] });
  ws.columns = [
    { width: 36 },
    { width: 10 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
  ];
  const u = 8;

  ws.mergeCells(1, 1, 1, u);
  ws.getCell("A1").value = "Decisiones del público por evidencia";
  ws.getCell("A1").font = { size: 18, bold: true, color: { argb: COLOR_ROJO } };
  ws.getRow(1).height = 30;
  parrafo(
    ws,
    2,
    u,
    "Solo primer intento de cada apodo, dentro de la temporada y hasta el cierre. El óptimo es la decisión de mayor valor esperado para cada evidencia (ver la hoja Explicación). Los gráficos comparan lo que hizo el público con lo óptimo.",
    150,
    fuenteSuave,
  );

  datos.dificultades.forEach((d, idx) => {
    const u2 = ubicacionDecisiones(idx);
    ws.mergeCells(u2.filaTitulo, 1, u2.filaTitulo, u);
    const t = ws.getCell(u2.filaTitulo, 1);
    t.value = `${nombreModo(modoDePrevalencia(d.prevalencia))} · prevalencia ${Math.round(d.prevalencia * 100)} % (${d.totalCasos} decisiones)`;
    t.font = { size: 13, bold: true, color: { argb: COLOR_ROJO } };

    const cab = ws.getRow(u2.filaCabecera);
    cab.values = [
      "Evidencia",
      "Casos",
      "% que aisló el público",
      "Decisión óptima",
      "% de decisiones óptimas",
      "% infectados (observado)",
      "Probabilidad teórica (Bayes)",
      "% que debería aislarse (óptimo)",
    ];
    estiloCabecera(cab, u);

    d.decisiones.forEach((f, i) => {
      const row = ws.getRow(u2.primeraFila + i);
      const sinCasos = f.casos === 0;
      row.getCell(1).value = f.etiqueta;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = f.casos;
      row.getCell(2).numFmt = FMT_ENTERO;
      row.getCell(3).value = sinCasos ? "—" : f.pctAislo;
      row.getCell(3).numFmt = FMT_PCT;
      row.getCell(4).value = f.optima === "aislar" ? "Aislar" : "Liberar";
      row.getCell(4).font = { bold: true, color: { argb: COLOR_ROJO } };
      row.getCell(5).value = sinCasos ? "—" : f.pctOptimas;
      row.getCell(5).numFmt = FMT_PCT;
      row.getCell(6).value = sinCasos ? "—" : f.pctInfectados;
      row.getCell(6).numFmt = FMT_PCT;
      row.getCell(7).value = f.posterior;
      row.getCell(7).numFmt = FMT_PCT;
      row.getCell(8).value = f.optima === "aislar" ? 1 : 0;
      row.getCell(8).numFmt = "0%";
      for (let c = 2; c <= u; c++) row.getCell(c).alignment = { horizontal: "center" };
      if (i % 2 === 1) row.eachCell((c) => (c.fill = rellenar(COLOR_BANDA)));
    });

    const total = ws.getRow(u2.filaTotal);
    total.values = [
      "Total",
      d.totalCasos,
      d.totalCasos === 0 || d.pctAisloTotal === null ? "—" : d.pctAisloTotal,
      "",
      d.totalCasos === 0 || d.pctOptimasTotal === null ? "—" : d.pctOptimasTotal,
      "",
      "",
      "",
    ];
    total.font = { bold: true };
    total.getCell(2).numFmt = FMT_ENTERO;
    total.getCell(3).numFmt = FMT_PCT;
    total.getCell(5).numFmt = FMT_PCT;
    total.eachCell((c) => (c.border = { top: { style: "thin", color: { argb: COLOR_OSCURO } } }));

    d.lecturas.forEach((texto, i) => {
      const fila = u2.filaLectura + i;
      ws.mergeCells(fila, 1, fila, u);
      const c = ws.getCell(fila, 1);
      c.value = texto;
      c.font = i === 0 ? { bold: true, color: { argb: COLOR_OSCURO } } : { color: { argb: COLOR_TEXTO_SUAVE } };
      c.alignment = { wrapText: true, vertical: "top" };
      ws.getRow(fila).height = altoFilaTexto(texto, 120);
    });
  });
  configurarImpresion(ws, HOJA_DECISIONES);
}

/* -------------------------------- Ranking ----------------------------- */

/** Una sola tabla (un autofiltro por hoja): la columna Dificultad permite filtrar. */
function hojaRanking(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_RANKING, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Dificultad", width: 16 },
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
      row.getCell(1).value = `${d.nombre} ${Math.round(d.prevalencia * 100)} %`;
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
  if (fila === 2) {
    ws.getCell("A2").value = "Sin partidas en el alcance del informe";
    ws.getCell("A2").font = fuenteSuave;
    fila = 3;
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, fila - 1), column: 6 } };
  configurarImpresion(ws, HOJA_RANKING);
}

/* --------------------------------- Podio ------------------------------ */

function hojaPodio(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_PODIO, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Dificultad", width: 16 },
    { header: "Puesto", width: 9 },
    { header: "Jugador", width: 26 },
    { header: "Puntaje", width: 11 },
    { header: "Tiempo total (m:ss)", width: 20 },
    { header: "Fecha (hora Managua)", width: 22 },
    { header: "Empate", width: 11 },
    { header: "Mismo dispositivo", width: 18 },
  ];
  estiloCabecera(ws.getRow(1));

  let fila = 2;
  for (const d of datos.dificultades) {
    const puestos = d.prevalencia === PREVALENCIA_EXPERTO ? datos.podio.experto : datos.podio.normal;
    if (puestos.length === 0) {
      const row = ws.getRow(fila++);
      row.getCell(1).value = `${d.nombre} ${Math.round(d.prevalencia * 100)} %`;
      row.getCell(2).value = "Sin partidas en el alcance del informe";
      row.getCell(2).font = fuenteSuave;
      continue;
    }
    for (const p of puestos) {
      const row = ws.getRow(fila++);
      row.getCell(1).value = `${d.nombre} ${Math.round(d.prevalencia * 100)} %`;
      row.getCell(2).value = p.posicion;
      row.getCell(3).value = p.jugador;
      row.getCell(4).value = p.puntaje;
      row.getCell(5).value = formatearTiempoTotal(p.tiempoTotalMs);
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(6).value = aHoraManagua(new Date(p.creada_en));
      row.getCell(6).numFmt = FMT_FECHA;
      row.getCell(7).value = sino(p.empate);
      row.getCell(8).value = sino(p.mismoDispositivo);
      if (p.empate) row.getCell(7).font = { bold: true, color: { argb: COLOR_ROJO } };
      if (p.mismoDispositivo) row.getCell(8).font = { bold: true, color: { argb: COLOR_ROJO } };
      const color = FILAS_PODIO[p.posicion - 1];
      row.getCell(2).fill = rellenar(color);
      row.getCell(3).font = { bold: true };
    }
  }
  fila += 1;
  ws.mergeCells(fila, 1, fila, 8);
  const nota =
    "Empate: mismo puntaje y tiempo total que el puesto vecino (se ordena por llegada). Mismo dispositivo: el mismo navegador ocupa más de un puesto. Son avisos para el organizador; no excluyen a nadie.";
  ws.getCell(fila, 1).value = nota;
  ws.getCell(fila, 1).font = fuenteSuave;
  ws.getCell(fila, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(fila).height = altoFilaTexto(nota, 150);
  configurarImpresion(ws, HOJA_PODIO);
}

/* ------------------------------ Respuestas ---------------------------- */

const NOMBRE_TABLA_RESPUESTAS = "TablaRespuestas";

type ColumnaRespuesta = {
  header: string;
  width: number;
  valor: (f: FilaRespuestaExport) => ExcelJS.CellValue;
  formato?: string;
};

function columnasRespuestas(hayEstimaciones: boolean): ColumnaRespuesta[] {
  const optima = (f: FilaRespuestaExport) => (f.evidencia === null ? null : decisionOptima(f.evidencia, modoDePrevalencia(f.prevalencia)));
  const base: ColumnaRespuesta[] = [
    { header: "ID partida", width: 38, valor: (f) => f.partidaId },
    { header: "Fecha (hora Managua)", width: 22, valor: (f) => aHoraManagua(f.creadaEn), formato: FMT_FECHA },
    { header: "Jugador", width: 24, valor: (f) => f.jugador },
    { header: "Modalidad", width: 12, valor: (f) => nombreModo(modoDePrevalencia(f.prevalencia)) },
    { header: "Primer intento", width: 14, valor: (f) => sino(f.primerIntento) },
    { header: "En el informe", width: 14, valor: (f) => sino(f.enInforme) },
    { header: "Puntaje partida", width: 14, valor: (f) => f.puntaje, formato: "0" },
    { header: "Tiempo total partida (ms)", width: 18, valor: (f) => f.tiempoTotalMs, formato: FMT_ENTERO },
    { header: "Orden", width: 8, valor: (f) => f.orden, formato: "0" },
    {
      header: "Evidencia",
      width: 34,
      valor: (f) => (f.evidencia === null ? "Sin dato (partida antigua)" : EVIDENCIAS[f.evidencia].etiqueta),
    },
  ];
  const estimacion: ColumnaRespuesta[] = hayEstimaciones
    ? [{ header: "Estimación (%)", width: 14, valor: (f) => f.estimacionPct, formato: "0" }]
    : [];
  const resto: ColumnaRespuesta[] = [
    { header: "Decisión", width: 12, valor: (f) => (f.decision === "aislar" ? "Aislar" : "Liberar") },
    { header: "Decisión óptima", width: 16, valor: (f) => (optima(f) === null ? "—" : optima(f) === "aislar" ? "Aislar" : "Liberar") },
    { header: "¿Óptima?", width: 11, valor: (f) => (optima(f) === null ? "—" : sino(f.decision === optima(f))) },
    { header: "Infectado", width: 11, valor: (f) => sino(f.estabaInfectado) },
    { header: "Tiempo respuesta (ms)", width: 16, valor: (f) => f.tiempoMs, formato: FMT_ENTERO },
  ];
  return [...base, ...estimacion, ...resto];
}

function hojaRespuestas(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_RESPUESTAS, { views: [{ state: "frozen", ySplit: 1 }] });
  const columnas = columnasRespuestas(datos.hayEstimaciones);
  ws.columns = columnas.map((c) => ({ width: c.width }));
  ws.addTable({
    name: NOMBRE_TABLA_RESPUESTAS,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns: columnas.map((c) => ({ name: c.header, filterButton: true })),
    rows: datos.respuestas.map((f) => columnas.map((c) => c.valor(f))),
  });
  estiloCabecera(ws.getRow(1));
  columnas.forEach((c, i) => {
    if (!c.formato) return;
    for (let r = 2; r <= datos.respuestas.length + 1; r++) ws.getRow(r).getCell(i + 1).numFmt = c.formato;
  });
  configurarImpresion(ws, HOJA_RESPUESTAS);
}

/* ------------------------------ Histograma ---------------------------- */

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

/** Texto junto al gráfico: qué son las barras y qué marca la barra oscura. */
export function notaHistograma(d: Pick<DificultadExport, "vppTeoricoPct">): string {
  const vpp = (Math.round(d.vppTeoricoPct * 10) / 10).toString().replace(".", ",");
  return `Estimaciones de partidas antiguas (antes de las decisiones). Cada barra cuenta cuántas cayeron en un tramo de 10 puntos. La barra oscura es el tramo que contiene el VPP teórico (${vpp} %), la respuesta correcta.`;
}

function hojaHistograma(wb: ExcelJS.Workbook, datos: DatosExport) {
  const ws = wb.addWorksheet(HOJA_HISTOGRAMA, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 16 }, { width: 28 }];
  datos.dificultades.forEach((d, idx) => {
    const u = ubicacionHistograma(idx);
    ws.mergeCells(u.filaTitulo, 1, u.filaTitulo, 6);
    const t = ws.getCell(u.filaTitulo, 1);
    t.value = `Estimaciones antiguas · ${d.nombre} ${Math.round(d.prevalencia * 100)} %`;
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
          c.fill = rellenar(COLOR_ROJO_SUAVE);
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
    c.font = fuenteSuave;
    ws.getRow(nota).height = altoFilaTexto(texto, 75);
  });
  configurarImpresion(ws, HOJA_HISTOGRAMA);
}

/* ------------------------------- Libro ------------------------------- */

export function construirLibro(datos: DatosExport): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alerta Roja";
  wb.title = `${TITULO_INFORME}`;
  wb.created = datos.generadoEn;
  hojaPortada(wb, datos, datos.hayEstimaciones);
  hojaExplicacion(wb);
  hojaDecisiones(wb, datos);
  hojaRanking(wb, datos);
  hojaPodio(wb, datos);
  hojaRespuestas(wb, datos);
  if (datos.hayEstimaciones) hojaHistograma(wb, datos);
  return wb;
}

export async function generarXlsx(datos: DatosExport): Promise<Buffer> {
  return Buffer.from(await construirLibro(datos).xlsx.writeBuffer());
}

/* ------------------------------ Gráficos ------------------------------ */

/** Histograma por dificultad (solo si hay estimaciones antiguas), a la derecha de su tabla. */
export function configsHistograma(datos: DatosExport): ConfigGrafico[] {
  if (!datos.hayEstimaciones) return [];
  return datos.dificultades.map((d, idx) => {
    const u = ubicacionHistograma(idx);
    const filas = bloqueHistograma(d);
    const marcada = filas.findIndex((f) => f.contieneVpp);
    return {
      hoja: u.hoja,
      titulo: `Estimaciones antiguas · ${d.nombre} (${Math.round(d.prevalencia * 100)} %)`,
      tituloEjeX: "Estimación (%)",
      tituloEjeY: "Cantidad de respuestas",
      primeraFila: u.primeraFila,
      ultimaFila: u.ultimaFila,
      colCategorias: u.colRango,
      categorias: filas.map((f) => f.rango),
      series: [
        {
          nombre: "Estimaciones",
          filaSerie: u.filaCabecera,
          colSerie: u.colCantidad,
          colValores: u.colCantidad,
          valores: filas.map((f) => f.cantidad),
          color: COLOR_ROJO_GRAFICO,
          indiceMarcado: marcada >= 0 ? marcada : null,
        },
      ],
      desde: { col: 7, fila: u.filaTitulo - 1 },
      hasta: { col: 17, fila: u.filaTitulo - 1 + 19 },
    };
  });
}

/** Una gráfica por modalidad: % que aisló el público frente al % que debería aislarse (óptimo). */
export function configsDecisiones(datos: DatosExport): ConfigGrafico[] {
  return datos.dificultades.map((d, idx) => {
    const u = ubicacionDecisiones(idx);
    return {
      hoja: HOJA_DECISIONES,
      titulo: `${nombreModo(modoDePrevalencia(d.prevalencia))}: qué hizo el público frente a lo óptimo`,
      tituloEjeX: "Evidencia",
      tituloEjeY: "Porcentaje de pacientes",
      primeraFila: u.primeraFila,
      ultimaFila: u.ultimaFila,
      colCategorias: 1,
      categorias: d.decisiones.map((f) => f.etiqueta),
      series: [
        {
          nombre: "% que aisló el público",
          filaSerie: u.filaCabecera,
          colSerie: u.colAislo,
          colValores: u.colAislo,
          valores: d.decisiones.map((f) => f.pctAislo ?? 0),
          color: COLOR_ROJO_GRAFICO,
          indiceMarcado: null,
        },
        {
          nombre: "% que debería aislarse (óptimo)",
          filaSerie: u.filaCabecera,
          colSerie: u.colOptimo,
          colValores: u.colOptimo,
          valores: d.decisiones.map((f) => (f.optima === "aislar" ? 1 : 0)),
          color: COLOR_OSCURO_GRAFICO,
          indiceMarcado: null,
        },
      ],
      formatoEjeY: "0%",
      formatoEtiquetas: "0%",
      maxEjeY: 1,
      desde: { col: COL_CHART_DESDE, fila: u.filaTitulo - 1 },
      hasta: { col: COL_CHART_HASTA, fila: u.filaTitulo - 1 + 18 },
    };
  });
}

/** Todos los gráficos del libro: histograma (si existe) y decisiones. */
export function configsGraficos(datos: DatosExport): ConfigGrafico[] {
  return [...configsHistograma(datos), ...configsDecisiones(datos)];
}

/** Excel con gráficos nativos; si el post-proceso falla, devuelve el libro sin gráficos. */
export async function generarXlsxConGraficos(
  datos: DatosExport,
  alFallar: (e: unknown) => void = () => {},
): Promise<Buffer> {
  return agregarGraficosSeguro(await generarXlsx(datos), configsGraficos(datos), alFallar);
}
