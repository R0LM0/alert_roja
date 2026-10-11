import { expect, test, type Locator, type Page } from "@playwright/test";

/** Regresión del panel en móviles: sin desborde horizontal, sin recortes y sin etiquetas encimadas. */

const VISTAS = [
  { nombre: "360x800", width: 360, height: 800 },
  { nombre: "390x844", width: 390, height: 844 },
] as const;

const CUBETAS = Array.from({ length: 10 }, (_, i) => ({
  desde: i * 10,
  hasta: i === 9 ? 100 : i * 10 + 9,
  cantidad: [0, 1, 3, 6, 9, 5, 4, 2, 1, 1][i],
}));

const STATS_LLENO = {
  prevalencia: 0.1,
  totalPartidas: 128,
  totalJugadores: 31,
  n: 32,
  estimacionPromedioPct: 100,
  vppObservadoPct: 100,
  vppTeoricoPct: 4.3,
  pctSobreestiman: 100,
  pctAislados: 40,
  aisladosSanos: 5,
  liberadosInfectados: 1,
  histograma: CUBETAS,
};

const STATS_VACIO = {
  ...STATS_LLENO,
  totalPartidas: 0,
  totalJugadores: 0,
  n: 0,
  estimacionPromedioPct: null,
  vppObservadoPct: null,
  pctSobreestiman: null,
  pctAislados: null,
  histograma: CUBETAS.map((c) => ({ ...c, cantidad: 0 })),
};

const RANKING_LLENO = Array.from({ length: 8 }, (_, i) => ({
  jugador: i === 1 ? "UnApodoMuyLargoDeVerdadSinEspacios" : `Jugador${i + 1}`,
  puntaje: 900 - i * 37,
  prevalencia: 0.1,
  creada_en: `2026-10-10T10:0${i}:00Z`,
  tiempoTotalMs: 61_000 + i * 7_300,
}));

async function simularApi(page: Page, vacio: boolean) {
  await page.route("**/api/stats*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify(vacio ? STATS_VACIO : STATS_LLENO) }),
  );
  await page.route("**/api/ranking*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ ranking: vacio ? [] : RANKING_LLENO }) }),
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

/** Etiquetas visibles del eje X (sin la del eje oculto de la línea). */
function ticksX(page: Page): Locator {
  return page.locator('[data-testid="histograma-grafico"] .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value');
}

for (const vista of VISTAS) {
  test.describe(`panel ${vista.nombre}`, () => {
    test.use({ viewport: { width: vista.width, height: vista.height } });

    test("con datos: sin desborde, tarjetas sin recortes y ticks sin encimarse", async ({ page }) => {
      await simularApi(page, false);
      await page.goto("/panel?key=x");
      await expect(page.getByTestId("tarjeta-estadistica")).toHaveCount(4);
      await expect(ticksX(page).first()).toBeVisible();

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

      const ticks = ticksX(page);
      const n = await ticks.count();
      expect(n).toBeGreaterThan(2);
      const cajas: Caja[] = [];
      for (let i = 0; i < n; i++) cajas.push(await caja(ticks.nth(i)));
      cajas.sort((a, b) => a.x - b.x);
      for (let i = 1; i < cajas.length; i++) {
        expect(cajas[i - 1].x + cajas[i - 1].width, `ticks ${i - 1} y ${i} encimados`).toBeLessThanOrEqual(cajas[i].x);
      }
    });

    test("sin respuestas: el mensaje no choca con los ejes y no hay desborde", async ({ page }) => {
      await simularApi(page, true);
      await page.goto("/panel?key=x");
      const mensaje = page.getByTestId("histograma-vacio");
      await expect(mensaje).toBeVisible();

      const cm = await caja(mensaje);
      const ticks = ticksX(page);
      const n = await ticks.count();
      for (let i = 0; i < n; i++) {
        expect(seCruzan(cm, await caja(ticks.nth(i))), `mensaje contra tick ${i}`).toBe(false);
      }
      const graficos = page.locator('[data-testid="histograma-grafico"] svg.recharts-surface');
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
