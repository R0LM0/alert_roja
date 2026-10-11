// Lógica pura de reparto para la Ciudad (revelación / fondo del panel).
// La UI no calcula estadística: recibe frecuencias y esta función solo
// distribuye 1000 esferas en posiciones deterministas (con semilla).

export const TOTAL_ESFERAS = 1000;

export type GrupoClave = "VP" | "FP" | "FN" | "VN";

/** Frecuencias absolutas que suma 1000 (p. ej. estándar: 90/180/10/720). */
export type Frecuencias = { vp: number; fp: number; fn: number; vn: number };

export type Vec3 = [number, number, number];

export interface EsferaLayout {
  id: number;
  grupo: GrupoClave;
  /** Posición mezclada (fase "ciudad"). */
  ciudad: Vec3;
  /** Posición reagrupada en tabla 2x2 (fase "tabla"). */
  tabla: Vec3;
}

export const ORDEN_GRUPOS: readonly GrupoClave[] = ["VP", "FP", "FN", "VN"] as const;

/** Fases de la revelación: mezcla inicial vs tabla reagrupada. */
export type FaseCiudad = "ciudad" | "tabla";

const CLAVE_POR_GRUPO: Record<GrupoClave, keyof Frecuencias> = {
  VP: "vp",
  FP: "fp",
  FN: "fn",
  VN: "vn",
};

/** Lienzo lógico compartido por 3D y 2D (mismas coordenadas). */
export const LIENZO = { ancho: 40, alto: 24 } as const;

/** Centro de cada bloque de la tabla 2x2 (para etiquetas/contadores). */
export const CENTRO_BLOQUE: Record<GrupoClave, Vec3> = {
  VP: [-10, 6, 0],
  FP: [10, 6, 0],
  FN: [-10, -6, 0],
  VN: [10, -6, 0],
};

const MARGEN_BLOQUE = 1.2;
/** Separación máxima de grilla: los grupos chicos se agrupan, no se dispersan. */
const CELDA_MAX = 1.15;

export const SEMILLA_POR_DEFECTO = 7;

/** PRNG determinista (mulberry32). */
function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mezcla Fisher-Yates determinista. */
function mezclar<T>(items: T[], azar: () => number): T[] {
  const resto = [...items];
  for (let i = resto.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [resto[i], resto[j]] = [resto[j], resto[i]];
  }
  return resto;
}

/**
 * Normaliza cualquier frecuencia a exactamente TOTAL_ESFERAS con
 * resto mayor (determinista, sin azar).
 */
export function normalizarFrecuencias(frecuencias: Frecuencias): Record<GrupoClave, number> {
  const bruto = ORDEN_GRUPOS.map((g) => Math.max(0, Math.floor(frecuencias[CLAVE_POR_GRUPO[g]] ?? 0)));
  const suma = bruto.reduce((a, b) => a + b, 0);
  if (suma === 0) {
    // Sin datos: todo a VN para no inventar positivos.
    return { VP: 0, FP: 0, FN: 0, VN: TOTAL_ESFERAS };
  }
  const exacto = bruto.map((b) => (b * TOTAL_ESFERAS) / suma);
  const base = exacto.map((e) => Math.floor(e));
  let faltan = TOTAL_ESFERAS - base.reduce((a, b) => a + b, 0);
  // Reparte el resto por mayor parte fraccionaria (desempate por orden fijo).
  const orden = exacto
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let k = 0;
  while (faltan > 0) {
    base[orden[k % orden.length].i] += 1;
    faltan -= 1;
    k += 1;
  }
  return { VP: base[0], FP: base[1], FN: base[2], VN: base[3] };
}

/** Caja envolvente 2D (x/y) de un conjunto de posiciones. */
export interface Caja {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function cajaDe(puntos: Vec3[]): Caja | null {
  if (puntos.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of puntos) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

function cajasSolapadas(a: Caja, b: Caja): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/**
 * Calcula el layout completo: misma lista de esferas con posición
 * "ciudad" (mezclada) y "tabla" (bloques 2x2 sin solaparse).
 * Pura y determinista: igual entrada + semilla => igual salida.
 */
export function calcularLayout(
  frecuencias: Frecuencias,
  semilla: number = SEMILLA_POR_DEFECTO,
): EsferaLayout[] {
  const conteo = normalizarFrecuencias(frecuencias);
  const azar = mulberry32(semilla);

  // Asignación mezclada: orden de grupos barajado con semilla.
  const bolsa: GrupoClave[] = [];
  for (const g of ORDEN_GRUPOS) {
    for (let i = 0; i < conteo[g]; i++) bolsa.push(g);
  }
  const gruposMezclados = mezclar(bolsa, azar);

  const esferas: EsferaLayout[] = gruposMezclados.map((grupo, id) => ({
    id,
    grupo,
    ciudad: [
      (azar() * 2 - 1) * (LIENZO.ancho / 2 - 1),
      (azar() * 2 - 1) * (LIENZO.alto / 2 - 1),
      (azar() * 2 - 1) * 1.5,
    ],
    tabla: [0, 0, 0],
  }));

  // Reagrupado: cada grupo en su cuadrante, confinado con margen
  // para que los bloques nunca se solapen.
  const cuadW = LIENZO.ancho / 2 - MARGEN_BLOQUE * 2;
  const cuadH = LIENZO.alto / 2 - MARGEN_BLOQUE * 2;
  for (const grupo of ORDEN_GRUPOS) {
    const lista = esferas.filter((e) => e.grupo === grupo);
    const n = lista.length;
    if (n === 0) continue;
    const [cx, cy] = CENTRO_BLOQUE[grupo];
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * cuadW) / cuadH)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const celda = Math.min(CELDA_MAX, cuadW / cols, cuadH / rows);
    const gridW = (cols - 1) * celda;
    const gridH = (rows - 1) * celda;
    const ox = cx - gridW / 2;
    const oy = cy + gridH / 2;
    lista.forEach((e, k) => {
      const col = k % cols;
      const fila = Math.floor(k / cols);
      e.tabla = [
        ox + col * celda + (azar() - 0.5) * celda * 0.3,
        oy - fila * celda + (azar() - 0.5) * celda * 0.3,
        (azar() * 2 - 1) * 0.6,
      ];
    });
  }

  return esferas;
}

/** Cuenta esferas por grupo. */
export function contarPorGrupo(esferas: EsferaLayout[]): Record<GrupoClave, number> {
  const conteo: Record<GrupoClave, number> = { VP: 0, FP: 0, FN: 0, VN: 0 };
  for (const e of esferas) conteo[e.grupo] += 1;
  return conteo;
}

/** Verifica que los bloques "tabla" no se solapen entre sí. */
export function bloquesSinSolaparse(esferas: EsferaLayout[]): boolean {
  const cajas: Caja[] = [];
  for (const grupo of ORDEN_GRUPOS) {
    const puntos = esferas.filter((e) => e.grupo === grupo).map((e) => e.tabla);
    if (puntos.length === 0) continue;
    const caja = cajaDe(puntos);
    if (caja) cajas.push(caja);
  }
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      if (cajasSolapadas(cajas[i], cajas[j])) return false;
    }
  }
  return true;
}
