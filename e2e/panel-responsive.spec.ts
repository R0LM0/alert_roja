import { expect, test, type Locator, type Page } from "@playwright/test";

/** Regresión del panel en móviles: sin desborde horizontal, sin recortes y sin etiquetas encimadas. */

const VISTAS = [
  { nombre: "360x800", width: 360, height: 800 },
  { nombre: "390x844", width: 390, height: 844 },
] as const;

const POR_EVIDENCIA = [
  { evidencia: "protegido", etiqueta: "Protegido", previoPct: 4, posteriorPct: 15.8, optima: "liberar", casos: 4, aislaronPct: 25 },
  { evidencia: "sin-antecedentes", etiqueta: "Sin antecedentes", previoPct: 10, posteriorPct: 33.3, optima: "aislar", casos: 6, aislaronPct: 66.7 },
  { evidencia: "sintomas", etiqueta: "Síntomas", previoPct: 18, posteriorPct: 49.7, optima: "aislar", casos: 5, aislaronPct: 80 },
  { evidencia: "contacto", etiqueta: "Contacto estrecho", previoPct: 25, posteriorPct: 60, optima: "aislar", casos: 9, aislaronPct: 88.9 },
  { evidencia: "conviviente", etiqueta: "Conviviente", previoPct: 40, posteriorPct: 75, optima: "aislar", casos: 8, aislaronPct: 100 },
];

const STATS_LLENO = {
  prevalencia: 0.1,
  totalPartidas: 128,
  totalJugadores: 31,
  n: 32,
  vppTeoricoPct: 33.3,
  vppObservadoPct: 40.6,
  decisionesOptimasPct: 62.5,
  puntajePromedio: 6.4,
  porEvidencia: POR_EVIDENCIA,
};

const STATS_VACIO = {
  ...STATS_LLENO,
  totalPartidas: 0,
  totalJugadores: 0,
  n: 0,
  vppObservadoPct: null,
  decisionesOptimasPct: null,
  puntajePromedio: null,
  porEvidencia: POR_EVIDENCIA.map((e) => ({ ...e, casos: 0, aislaronPct: null })),
};

const RANKING_LLENO = Array.from({ length: 8 }, (_, i) => ({
  jugador: i === 1 ? "UnApodoMuyLargoDeVerdadSinEspacios" : `Jugador${i + 1}`,
  puntaje: 900 - i * 37,
  prevalencia: 0.1,
  creada_en: `2026-10-10T10:0${i}:00Z`,
  tiempoTotalMs: 61_000 + i * 7_300,
  insignias: i === 0 ? ["perfecto"] : [],
}));

const ACTIVIDAD_LLENA = Array.from({ length: 8 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  jugador: i === 0 ? "OtroApodoMuyLargoSinEspaciosNada" : `Visitante${i + 1}`,
  puntaje: 800 - i * 21,
  creada_en: new Date(Date.now() - (i + 1) * 40_000).toISOString(),
  primer_intento: i !== 2,
}));

async function simularApi(page: Page, vacio: boolean) {
  await page.route("**/api/stats*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify(vacio ? STATS_VACIO : STATS_LLENO) }),
  );
  await page.route("**/api/ranking*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ ranking: vacio ? [] : RANKING_LLENO }) }),
  );
  await page.route("**/api/actividad*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ actividad: vacio ? [] : ACTIVIDAD_LLENA }) }),
  );
}

type Caja = { x: number; y: number; width: number; height: number };

async function caja(l: Locator): Promise<Caja> {
  const b = await l.boundingBox();
  if (!b) throw new Error("Elemento sin caja");
  return b;
}

const seCruzan = (a: Caja, b: Caja) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const dentro = (hijo: Caja, padre: Caja) =>
  hijo.x >= padre.x - 0.5 &&
  hijo.y >= padre.y - 0.5 &&
  hijo.x + hijo.width <= padre.x + padre.width + 0.5 &&
  hijo.y + hijo.height <= padre.y + padre.height + 0.5;

/** Etiquetas visibles del eje de evidencias (eje Y del gráfico de barras horizontales). */
function etiquetasEvidencia(page: Page): Locator {
  return page.locator('[data-testid="decisiones-grafico"] svg text').filter({ hasText: /casos|sin casos|\(\d+\)/ });
}

/** Tarjeta de cifra cuyo título contiene `titulo`. */
function tarjeta(page: Page, titulo: string): Locator {
  return page.getByTestId("tarjeta-estadistica").filter({ hasText: titulo });
}

for (const vista of VISTAS) {
  test.describe(`panel ${vista.nombre}`, () => {
    test.use({ viewport: { width: vista.width, height: vista.height } });

    test("con datos: sin desborde, tarjetas sin recortes y etiquetas sin encimarse", async ({ page }) => {
      await simularApi(page, false);
      await page.goto("/panel?key=x");
      await expect(page.getByTestId("tarjeta-estadistica")).toHaveCount(4);
      await expect(page.getByTestId("decisiones-grafico")).toBeVisible();
      await expect(etiquetasEvidencia(page).first()).toBeVisible();
      await expect(page.getByText("EN VIVO", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Acaban de jugar" })).toBeVisible();
      await expect(page.getByText("OtroApodoMuyLargoSinEspaciosNada")).toBeVisible();

      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(desborde, "desborde horizontal de la página").toBeLessThanOrEqual(0);

      const tarjetas = page.getByTestId("tarjeta-estadistica");
      for (let i = 0; i < 4; i++) {
        const t = tarjetas.nth(i);
        const cajaT = await caja(t);
        for (const id of ["stat-titulo", "stat-valor", "stat-nota"]) {
          const el = t.getByTestId(id);
          const c = await caja(el);
          expect(dentro(c, cajaT), `${id} de la tarjeta ${i} dentro de la tarjeta`).toBe(true);
          const recorte = await el.evaluate((n) => n.scrollWidth - n.clientWidth);
          expect(recorte, `${id} de la tarjeta ${i} recortado`).toBeLessThanOrEqual(0);
        }
        const valor = t.getByTestId("stat-valor");
        const lineas = await valor.evaluate((n) => n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight));
        expect(lineas, `número de la tarjeta ${i} en una sola línea`).toBeLessThan(1.5);
      }

      const etiquetas = etiquetasEvidencia(page);
      const n = await etiquetas.count();
      expect(n).toBe(POR_EVIDENCIA.length);
      const cajas: Caja[] = [];
      for (let i = 0; i < n; i++) cajas.push(await caja(etiquetas.nth(i)));
      cajas.sort((a, b) => a.y - b.y);
      for (let i = 1; i < cajas.length; i++) {
        expect(cajas[i - 1].y + cajas[i - 1].height, `etiquetas ${i - 1} y ${i} encimadas`).toBeLessThanOrEqual(cajas[i].y);
      }
    });

    test("ocultas por defecto: VPP con \"?\" y el gráfico sin la decisión óptima", async ({ page }) => {
      await simularApi(page, false);
      await page.goto("/panel?key=x");
      await expect(tarjeta(page, "VPP teórico").getByTestId("stat-valor")).toHaveText("?");
      await expect(tarjeta(page, "VPP observado").getByTestId("stat-valor")).toHaveText("?");
      await expect(page.getByRole("button", { name: "Revelar respuesta" })).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByText("Decisión óptima: ?")).toBeVisible();
      // Sin revelar no aparece ninguna decisión óptima en el gráfico ni en su tabla oculta.
      await expect(page.getByText("Aislar", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Liberar", { exact: true })).toHaveCount(0);
    });

    test("?revelar=1: muestra VPP y la decisión óptima", async ({ page }) => {
      await simularApi(page, false);
      await page.goto("/panel?key=x&revelar=1");
      await expect(tarjeta(page, "VPP teórico").getByTestId("stat-valor")).toHaveText("33,3 %");
      await expect(tarjeta(page, "VPP observado").getByTestId("stat-valor")).toHaveText("40,6 %");
      await expect(page.getByRole("button", { name: "Ocultar respuesta" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("list", { name: "Leyenda" }).getByText("Decisión óptima", { exact: true })).toBeVisible();
      await expect(page.getByText("Aislar", { exact: true }).first()).toBeVisible();
    });

    test("sin respuestas: el mensaje no choca con los ejes y no hay desborde", async ({ page }) => {
      await simularApi(page, true);
      await page.goto("/panel?key=x");
      const mensaje = page.getByTestId("decisiones-vacio");
      await expect(mensaje).toBeVisible();

      const cm = await caja(mensaje);
      const graficos = page.locator('[data-testid="decisiones-grafico"] svg.recharts-surface');
      for (let i = 0; i < (await graficos.count()); i++) {
        expect(seCruzan(cm, await caja(graficos.nth(i))), "mensaje encima del gráfico").toBe(false);
      }
      const recorte = await mensaje.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(recorte).toBeLessThanOrEqual(0);

      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(desborde, "desborde horizontal de la página").toBeLessThanOrEqual(0);
    });
  });
}
