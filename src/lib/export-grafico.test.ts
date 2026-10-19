import ExcelJS from "exceljs";
import JSZip from "jszip";
import { SaxesParser } from "saxes";
import { describe, expect, it, vi } from "vitest";
import { construirDificultad } from "./export-datos";
import { agregarGraficosHistograma, agregarGraficosSeguro, chartXml, type ConfigGrafico } from "./export-grafico";
import {
  configsGraficos,
  configsHistograma,
  generarXlsx,
  generarXlsxConGraficos,
  notaHistograma,
  ubicacionHistograma,
  type DatosExport,
  type FilaRespuestaExport,
} from "./export-xlsx";
import { armarPodio } from "./podio";
import { PREVALENCIA, PREVALENCIA_EXPERTO, vppBayes } from "./stats";

/** Respuestas de primer intento con estimación antigua: reproducen el histograma de la prueba. */
function estimadas(estimaciones: number[], prevalencia: number): FilaRespuestaExport[] {
  return estimaciones.map((estimacionPct, i) => ({
    partidaId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    creadaEn: new Date("2026-10-20T15:00:00Z"),
    jugador: `J${i}`,
    prevalencia,
    puntaje: 5,
    tiempoTotalMs: 60_000,
    primerIntento: true,
    enInforme: true,
    orden: 1,
    evidencia: "conviviente",
    estimacionPct,
    decision: "aislar",
    estabaInfectado: true,
    tiempoMs: 5_000,
  }));
}

const respuestasNormal = estimadas([5, 35, 35, 60, 80, 90, 90, 90], PREVALENCIA);
const datos: DatosExport = {
  generadoEn: new Date("2026-05-02T12:00:00Z"),
  cierre: null,
  hayEstimaciones: true,
  dificultades: [
    construirDificultad(PREVALENCIA, "Normal", respuestasNormal, [], null),
    construirDificultad(PREVALENCIA_EXPERTO, "Experto", estimadas([2, 5, 20, 60, 100], PREVALENCIA_EXPERTO), [], null),
  ],
  podio: armarPodio([]),
  respuestas: respuestasNormal,
};

function esBienFormado(xml: string) {
  const p = new SaxesParser();
  let error: Error | null = null;
  p.on("error", (e) => (error = e));
  p.write(xml).close();
  return error;
}

async function generar() {
  const base = await generarXlsx(datos);
  const final = await agregarGraficosHistograma(base, configsGraficos(datos));
  return { base, final, zip: await JSZip.loadAsync(final) };
}

const texto = async (zip: JSZip, ruta: string) => zip.file(ruta)!.async("string");

describe("agregarGraficosHistograma", () => {
  it("añade las partes, los content types y un único <drawing> en la hoja", async () => {
    const { zip } = await generar();
    for (const ruta of [
      "xl/charts/chart1.xml",
      "xl/charts/chart2.xml",
      "xl/drawings/drawing1.xml",
      "xl/drawings/_rels/drawing1.xml.rels",
    ]) {
      expect(zip.file(ruta), ruta).not.toBeNull();
    }
    const tipos = await texto(zip, "[Content_Types].xml");
    expect(tipos).toContain('PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"');
    for (const n of [1, 2]) {
      expect(tipos).toContain(
        `PartName="/xl/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"`,
      );
    }

    // Hoja Histograma: la tercera del libro.
    const wb = await texto(zip, "xl/workbook.xml");
    const rid = /<sheet\b[^>]*name="Histograma"[^>]*r:id="(rId\d+)"/.exec(wb)![1];
    const rels = await texto(zip, "xl/_rels/workbook.xml.rels");
    const destino = new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels) ??
      new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels);
    const rutaSheet = `xl/${destino![1].replace(/^\/?(xl\/)?/, "")}`;
    const sheet = await texto(zip, rutaSheet);
    expect(sheet.match(/<drawing\b/g)).toHaveLength(1);
    expect(sheet).toMatch(/<worksheet\b[^>]*xmlns:r=/);
    const pos = (tag: string) => sheet.indexOf(tag);
    expect(pos("<drawing")).toBeGreaterThan(pos("<pageMargins"));
    for (const despues of ["<legacyDrawing", "<tableParts"]) {
      if (pos(despues) >= 0) expect(pos("<drawing")).toBeLessThan(pos(despues));
    }

    // rId del <drawing> existe en las relaciones de la hoja y los ids son únicos.
    const rutaRels = rutaSheet.replace(/([^/]+)$/, "_rels/$1.rels");
    const relsHoja = await texto(zip, rutaRels);
    const ids = [...relsHoja.matchAll(/\bId="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(/<drawing\b[^>]*r:id="([^"]+)"/.exec(sheet)![1]);
    expect(relsHoja).toContain('Target="../drawings/drawing1.xml"');
  });

  it("el gráfico referencia los rangos de ubicacionHistograma y marca el tramo del VPP", async () => {
    const { zip } = await generar();
    for (const [idx, d] of datos.dificultades.entries()) {
      const u = ubicacionHistograma(idx);
      const xml = await texto(zip, `xl/charts/chart${idx + 1}.xml`);
      expect(xml).toContain(`<c:f>Histograma!$A$${u.primeraFila}:$A$${u.ultimaFila}</c:f>`);
      expect(xml).toContain(`<c:f>Histograma!$D$${u.primeraFila}:$D$${u.ultimaFila}</c:f>`);
      expect(xml).toContain('<c:barDir val="col"/><c:grouping val="clustered"/>');
      expect(xml).toContain("Cantidad de respuestas");
      expect(xml).toContain(`${d.nombre} (${Math.round(d.prevalencia * 100)} %)`);
      expect(xml).toContain("<c:v>0–9</c:v>");
      expect(xml).toContain("<c:v>90–100</c:v>");
      expect(xml).toContain('<c:showVal val="1"/>');
      expect(xml.match(/<c:dPt>/g)).toHaveLength(1);
    }
    // Normal: VPP 33,3 % -> tramo 30–39 (índice 3); Experto: 4,3 % -> 0–9 (índice 0).
    expect(await texto(zip, "xl/charts/chart1.xml")).toContain('<c:dPt><c:idx val="3"/>');
    expect(await texto(zip, "xl/charts/chart2.xml")).toContain('<c:dPt><c:idx val="0"/>');
  });

  it("todas las partes nuevas o modificadas son XML bien formado", async () => {
    const { zip } = await generar();
    const rutas = Object.keys(zip.files).filter((r) => /\.(xml|rels)$/.test(r));
    expect(rutas.length).toBeGreaterThan(8);
    for (const ruta of rutas) expect(esBienFormado(await texto(zip, ruta)), ruta).toBeNull();
  });

  it("el libro final se recarga con exceljs y conserva hojas y datos", async () => {
    const { final } = await generar();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(final as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Portada",
      "Explicación",
      "Decisiones",
      "Ranking",
      "Podio",
      "Respuestas",
      "Histograma",
    ]);
    const ws = wb.getWorksheet("Histograma")!;
    const u = ubicacionHistograma(0);
    expect(ws.getCell(u.primeraFila, u.colRango).value).toBe("0–9");
    expect(ws.getCell(u.primeraFila, u.colCantidad).value).toBe(1);
    expect(ws.getCell(u.filaNota, 1).value).toBe(notaHistograma(datos.dificultades[0]));
  });

  it("escapa el texto del título y rechaza una hoja que ya tiene <drawing>", async () => {
    const cfg = { ...configsGraficos(datos)[0], titulo: 'A & <B> "c"' };
    expect(chartXml(cfg)).toContain("A &amp; &lt;B&gt; &quot;c&quot;");
    const una = await agregarGraficosHistograma(await generarXlsx(datos), [configsGraficos(datos)[0]]);
    await expect(agregarGraficosHistograma(una, [configsGraficos(datos)[1]])).rejects.toThrow(/drawing/);
  });
});

describe("gráfico de decisiones (dos series)", () => {
  const config: ConfigGrafico = {
    hoja: "Decisiones",
    titulo: "Normal: público frente a óptimo",
    tituloEjeX: "Evidencia",
    tituloEjeY: "Porcentaje de pacientes",
    primeraFila: 6,
    ultimaFila: 8,
    colCategorias: 1,
    categorias: ["Conviviente con caso", "Contacto estrecho", "Sin antecedentes"],
    series: [
      { nombre: "% que aisló el público", filaSerie: 5, colSerie: 3, colValores: 3, valores: [1, 0.5, 0], color: "DC2626", indiceMarcado: null },
      { nombre: "% que debería aislarse (óptimo)", filaSerie: 5, colSerie: 8, colValores: 8, valores: [1, 1, 0], color: "18181B", indiceMarcado: null },
    ],
    formatoEjeY: "0%",
    formatoEtiquetas: "0%",
    maxEjeY: 1,
    desde: { col: 9, fila: 3 },
    hasta: { col: 18, fila: 21 },
  };

  it("dos series con sus referencias, leyenda, formato porcentual y eje fijo a 100 %", () => {
    const xml = chartXml(config);
    expect(xml.match(/<c:ser>/g)).toHaveLength(2);
    expect(xml).toContain("<c:f>Decisiones!$C$6:$C$8</c:f>");
    expect(xml).toContain("<c:f>Decisiones!$H$6:$H$8</c:f>");
    expect(xml).toContain("<c:f>Decisiones!$C$5</c:f>");
    expect(xml).toContain("<c:legend>");
    expect(xml).toContain('<c:numFmt formatCode="0%" sourceLinked="0"/>');
    expect(xml).toContain('<c:max val="1"/>');
    expect(xml).toContain("% que debería aislarse (óptimo)");
    expect(esBienFormado(xml)).toBeNull();
  });

  it("una sola serie no lleva leyenda", () => {
    expect(chartXml({ ...config, series: [config.series[0]] })).not.toContain("<c:legend>");
  });

  it("el libro incorpora las dos gráficas de decisiones en la hoja Decisiones", async () => {
    const zip = await JSZip.loadAsync(await generarXlsxConGraficos(datos));
    const wb = await texto(zip, "xl/workbook.xml");
    const rid = /<sheet\b[^>]*name="Decisiones"[^>]*r:id="(rId\d+)"/.exec(wb)![1];
    const rels = await texto(zip, "xl/_rels/workbook.xml.rels");
    const destino = new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels) ??
      new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels);
    const rutaSheet = `xl/${destino![1].replace(/^\/?(xl\/)?/, "")}`;
    const relsHoja = await texto(zip, rutaSheet.replace(/([^/]+)$/, "_rels/$1.rels"));
    const dibujo = /Target="\.\.\/drawings\/(drawing\d+\.xml)"/.exec(relsHoja)![1];
    const relsDibujo = await texto(zip, `xl/drawings/_rels/${dibujo}.rels`);
    expect(relsDibujo.match(/charts\/chart\d+\.xml/g)).toHaveLength(2);
  });
});

describe("generarXlsxConGraficos y fallback", () => {
  it("incluye los gráficos del histograma y los de decisiones", async () => {
    const zip = await JSZip.loadAsync(await generarXlsxConGraficos(datos));
    expect(Object.keys(zip.files).filter((r) => /^xl\/charts\/chart\d+\.xml$/.test(r))).toHaveLength(4);
  });

  it("sin estimaciones solo quedan los dos gráficos de decisiones", async () => {
    const sinEstimaciones: DatosExport = {
      ...datos,
      hayEstimaciones: false,
      dificultades: [
        construirDificultad(PREVALENCIA, "Normal", [], [], null),
        construirDificultad(PREVALENCIA_EXPERTO, "Experto", [], [], null),
      ],
    };
    expect(configsHistograma(sinEstimaciones)).toEqual([]);
    expect(configsGraficos(sinEstimaciones)).toHaveLength(2);
    const zip = await JSZip.loadAsync(await generarXlsxConGraficos(sinEstimaciones));
    expect(Object.keys(zip.files).filter((r) => /^xl\/charts\/chart\d+\.xml$/.test(r))).toHaveLength(2);
  });

  it("si el post-proceso falla devuelve el libro original y avisa", async () => {
    const base = await generarXlsx(datos);
    const alFallar = vi.fn();
    const salida = await agregarGraficosSeguro(base, configsGraficos(datos), alFallar, async () => {
      throw new Error("boom");
    });
    expect(salida).toBe(base);
    expect(alFallar).toHaveBeenCalledOnce();
    // Un buffer que no es un zip también cae al libro original.
    const basura = Buffer.from("no es un zip");
    expect(await agregarGraficosSeguro(basura, configsGraficos(datos), () => {})).toBe(basura);
  });
});
