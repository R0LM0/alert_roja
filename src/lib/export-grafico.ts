import JSZip from "jszip";

/**
 * Gráficos nativos (editables) para el .xlsx. exceljs no tiene API de gráficos, así que se
 * añaden a mano las partes OOXML al zip ya generado: chartN, drawingN, rels, hoja y content types.
 */

/** Una serie de barras: sus valores están en `colValores`, con nombre en la celda (filaSerie, colSerie). */
export type SerieGrafico = {
  nombre: string;
  /** Celda (1 = A) del encabezado de la serie. */
  filaSerie: number;
  colSerie: number;
  /** Columna (1 = A) de los valores; las filas son las de ConfigGrafico. */
  colValores: number;
  /** Valores en caché, para visores que no recalculan. */
  valores: number[];
  color: string;
  /** Índice (0-based) de la barra resaltada en negro, o null. */
  indiceMarcado: number | null;
};

export type ConfigGrafico = {
  /** Nombre de la hoja donde están los datos y donde se coloca el gráfico. */
  hoja: string;
  titulo: string;
  tituloEjeX: string;
  tituloEjeY: string;
  /** Rango de categorías y de datos: filas primera..ultima (1-based), columna de categorías (1 = A). */
  primeraFila: number;
  ultimaFila: number;
  colCategorias: number;
  categorias: string[];
  series: SerieGrafico[];
  /** Formato del eje de valores y de las etiquetas (Excel). Por defecto "0" y "General". */
  formatoEjeY?: string;
  formatoEtiquetas?: string;
  /** Máximo fijo del eje de valores (p. ej. 1 para fracciones). */
  maxEjeY?: number;
  /** Celdas 0-based; `hasta` es exclusivo. */
  desde: { col: number; fila: number };
  hasta: { col: number; fila: number };
};

/** Colores de la paleta: rojo de acento, gris oscuro para lo óptimo, gris claro para lo demás. */
export const COLOR_ROJO_GRAFICO = "DC2626";
export const COLOR_OSCURO_GRAFICO = "18181B";
export const COLOR_GRIS_GRAFICO = "A1A1AA";
const COLOR_BARRA = COLOR_ROJO_GRAFICO;
const COLOR_MARCADA = COLOR_OSCURO_GRAFICO;

const NS_C = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_XDR = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const REL_DRAWING = `${NS_R}/drawing`;
const REL_CHART = `${NS_R}/chart`;
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function letraColumna(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Referencia absoluta de rango, p. ej. Histograma!$A$3:$A$12 (comillas solo si el nombre las necesita). */
function refRango(hoja: string, col: number, f1: number, f2: number): string {
  const c = letraColumna(col);
  return `${nombreHojaRef(hoja)}!$${c}$${f1}:$${c}$${f2}`;
}

function nombreHojaRef(hoja: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(hoja) ? hoja : `'${hoja.replace(/'/g, "''")}'`;
}

/* ------------------------------- XML ------------------------------- */

function tituloXml(texto: string, tam: number, negrita: boolean): string {
  return (
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${tam}" b="${negrita ? 1 : 0}"/></a:pPr>` +
    `<a:r><a:rPr lang="es-NI" sz="${tam}" b="${negrita ? 1 : 0}"/><a:t>${esc(texto)}</a:t></a:r></a:p></c:rich></c:tx>` +
    `<c:overlay val="0"/></c:title>`
  );
}

const relleno = (hex: string) => `<c:spPr><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill></c:spPr>`;

/** Serie de barras (orden de hijos según CT_BarSer; Excel es estricto con él). */
function serieXml(g: ConfigGrafico, s: SerieGrafico, idx: number): string {
  const n = g.categorias.length;
  const cat = refRango(g.hoja, g.colCategorias, g.primeraFila, g.ultimaFila);
  const val = refRango(g.hoja, s.colValores, g.primeraFila, g.ultimaFila);
  const nombre = `${nombreHojaRef(g.hoja)}!$${letraColumna(s.colSerie)}$${s.filaSerie}`;
  const puntos = (xs: (string | number)[]) =>
    xs.map((x, i) => `<c:pt idx="${i}"><c:v>${esc(String(x))}</c:v></c:pt>`).join("");
  const marcada =
    s.indiceMarcado === null
      ? ""
      : `<c:dPt><c:idx val="${s.indiceMarcado}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${relleno(COLOR_MARCADA)}</c:dPt>`;
  const formato = esc(g.formatoEtiquetas ?? "General");
  return (
    `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>` +
    `<c:tx><c:strRef><c:f>${esc(nombre)}</c:f><c:strCache><c:ptCount val="1"/>${puntos([s.nombre])}</c:strCache></c:strRef></c:tx>` +
    `${relleno(s.color)}<c:invertIfNegative val="0"/>${marcada}` +
    `<c:dLbls><c:numFmt formatCode="${formato}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>` +
    `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000" b="1"/></a:pPr><a:endParaRPr lang="es-NI"/></a:p></c:txPr>` +
    `<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>` +
    `<c:cat><c:strRef><c:f>${esc(cat)}</c:f><c:strCache><c:ptCount val="${n}"/>${puntos(g.categorias)}</c:strCache></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${esc(val)}</c:f><c:numCache><c:formatCode>${formato}</c:formatCode><c:ptCount val="${n}"/>${puntos(s.valores)}</c:numCache></c:numRef></c:val>` +
    `</c:ser>`
  );
}

/** Gráfico de columnas agrupadas (una o varias series) con títulos, ejes y etiquetas de valor. */
export function chartXml(g: ConfigGrafico): string {
  const formatoEje = esc(g.formatoEjeY ?? "0");
  const maximo = g.maxEjeY === undefined ? "" : `<c:max val="${g.maxEjeY}"/>`;
  const leyenda =
    g.series.length > 1
      ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000"/></a:pPr><a:endParaRPr lang="es-NI"/></a:p></c:txPr></c:legend>`
      : "";
  return (
    XML_DECL +
    `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>${tituloXml(g.titulo, 1400, true)}<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>` +
    g.series.map((s, i) => serieXml(g, s, i)).join("") +
    `<c:gapWidth val="60"/><c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>` +
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>` +
    `${tituloXml(g.tituloEjeX, 1000, false)}<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="222222222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/>${maximo}<c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>` +
    `<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E4E4E7"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `${tituloXml(g.tituloEjeY, 1000, false)}<c:numFmt formatCode="${formatoEje}" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="111111111"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea>${leyenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>` +
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D4D4D8"/></a:solidFill></a:ln></c:spPr>` +
    `</c:chartSpace>`
  );
}

/** Un drawing por hoja (Excel admite uno solo): una ancla por gráfico, con su relación rId. */
function drawingXml(items: { g: ConfigGrafico; rid: string; id: number }[]): string {
  const anclas = items
    .map(
      ({ g, rid, id }) =>
        `<xdr:twoCellAnchor editAs="oneCell">` +
        `<xdr:from><xdr:col>${g.desde.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.desde.fila}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${g.hasta.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.hasta.fila}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id + 1}" name="${esc(`Gráfico ${id}`)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="${rid}"/></a:graphicData></a:graphic>` +
        `</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`,
    )
    .join("");
  return XML_DECL + `<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}">${anclas}</xdr:wsDr>`;
}

const relsXml = (rels: { id: string; type: string; target: string }[]) =>
  XML_DECL +
  `<Relationships xmlns="${NS_REL}">` +
  rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${esc(r.target)}"/>`).join("") +
  `</Relationships>`;

/* --------------------------- Manipulación del zip --------------------------- */

function atributos(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

async function leer(zip: JSZip, ruta: string): Promise<string> {
  const f = zip.file(ruta);
  if (!f) throw new Error(`Falta la parte ${ruta} en el .xlsx`);
  return f.async("string");
}

/** Ruta de la parte de una hoja, vía workbook.xml + sus relaciones (no se asume sheetN.xml). */
async function rutaHoja(zip: JSZip, nombre: string): Promise<string> {
  const wb = await leer(zip, "xl/workbook.xml");
  const rels = await leer(zip, "xl/_rels/workbook.xml.rels");
  const hoja = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => atributos(m[0])).find((a) => a.name === esc(nombre) || a.name === nombre);
  const rid = hoja?.["r:id"];
  if (!rid) throw new Error(`No se encontró la hoja "${nombre}"`);
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => atributos(m[0])).find((a) => a.Id === rid);
  if (!rel?.Target) throw new Error(`Sin relación para la hoja "${nombre}"`);
  return rel.Target.startsWith("/") ? rel.Target.slice(1) : `xl/${rel.Target}`;
}

/** Siguiente rIdN libre en un fichero de relaciones. */
function nuevoRid(relsXmlExistente: string): string {
  const usados = [...relsXmlExistente.matchAll(/\bId="rId(\d+)"/g)].map((m) => Number(m[1]));
  return `rId${Math.max(0, ...usados) + 1}`;
}

/** Inserta `<drawing>` en la posición del esquema: tras pageMargins/pageSetup/headerFooter/…, antes de legacyDrawing/tableParts. */
function insertarDrawing(sheetXml: string, rid: string): string {
  if (/<drawing\b/.test(sheetXml)) throw new Error("La hoja ya tiene un <drawing>");
  let xml = sheetXml;
  if (!/<worksheet\b[^>]*\sxmlns:r="/.test(xml)) {
    xml = xml.replace(/<worksheet\b/, `<worksheet xmlns:r="${NS_R}"`);
  }
  const tag = `<drawing r:id="${rid}"/>`;
  const siguiente = xml.search(/<(legacyDrawing|legacyDrawingHF|drawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/);
  if (siguiente >= 0) return xml.slice(0, siguiente) + tag + xml.slice(siguiente);
  return xml.replace(/<\/worksheet>\s*$/, `${tag}</worksheet>`);
}

/**
 * Añade los gráficos al .xlsx. Los gráficos se agrupan por hoja (un drawing por hoja).
 * Lanza si el zip no tiene la estructura esperada; usar `agregarGraficosSeguro` para degradar.
 */
export async function agregarGraficosHistograma(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  graficos: ConfigGrafico[],
): Promise<Buffer> {
  if (graficos.length === 0) return Buffer.from(buffer as Uint8Array);
  const zip = await JSZip.loadAsync(buffer);
  let tipos = await leer(zip, "[Content_Types].xml");
  const overrides: string[] = [];

  const porHoja = new Map<string, ConfigGrafico[]>();
  for (const g of graficos) porHoja.set(g.hoja, [...(porHoja.get(g.hoja) ?? []), g]);

  let nChart = 0;
  let nDrawing = 0;
  for (const [hoja, lista] of porHoja) {
    const rutaSheet = await rutaHoja(zip, hoja);
    const rutaRels = rutaSheet.replace(/([^/]+)$/, "_rels/$1.rels");
    const dibujo = ++nDrawing;

    // Gráficos del drawing.
    const items = lista.map((g) => {
      const id = ++nChart;
      zip.file(`xl/charts/chart${id}.xml`, chartXml(g));
      overrides.push(`<Override PartName="/xl/charts/chart${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
      return { g, id, rid: `rId${id}` };
    });
    zip.file(`xl/drawings/drawing${dibujo}.xml`, drawingXml(items));
    zip.file(
      `xl/drawings/_rels/drawing${dibujo}.xml.rels`,
      relsXml(items.map((it) => ({ id: it.rid, type: REL_CHART, target: `../charts/chart${it.id}.xml` }))),
    );
    overrides.push(`<Override PartName="/xl/drawings/drawing${dibujo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);

    // Relación hoja -> drawing (se mezcla con las existentes, p. ej. hipervínculos).
    const relsPrevio = zip.file(rutaRels) ? await leer(zip, rutaRels) : null;
    const rid = nuevoRid(relsPrevio ?? "");
    const nueva = `<Relationship Id="${rid}" Type="${REL_DRAWING}" Target="../drawings/drawing${dibujo}.xml"/>`;
    zip.file(
      rutaRels,
      relsPrevio ? relsPrevio.replace(/<\/Relationships>\s*$/, `${nueva}</Relationships>`) : relsXml([]).replace("</Relationships>", `${nueva}</Relationships>`),
    );

    zip.file(rutaSheet, insertarDrawing(await leer(zip, rutaSheet), rid));
  }

  tipos = tipos.replace(/<\/Types>\s*$/, `${overrides.join("")}</Types>`);
  zip.file("[Content_Types].xml", tipos);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Nunca rompe la descarga: si el post-proceso falla, devuelve el libro original y avisa. */
export async function agregarGraficosSeguro(
  base: Buffer,
  graficos: ConfigGrafico[],
  alFallar: (e: unknown) => void,
  aplicar: typeof agregarGraficosHistograma = agregarGraficosHistograma,
): Promise<Buffer> {
  try {
    return await aplicar(base, graficos);
  } catch (e) {
    alFallar(e);
    return base;
  }
}
