import { expect, test } from "@playwright/test";

/**
 * /mis-insignias y su enlace en el inicio. Sin base de datos: el historial de
 * insignias vive en localStorage (clave "alerta-roja:insignias"), igual que en
 * src/lib/sesion-juego.ts.
 */
const CLAVE_INSIGNIAS = "alerta-roja:insignias";
const CLAVE_APODO = "alerta-roja:apodo";

const HISTORIAL = [
  {
    jugador: "ana",
    insignias: [
      { id: "perfecto", fecha: "2026-10-18T10:00:00.000Z" },
      { id: "rayo", fecha: "2026-10-19T10:00:00.000Z" },
    ],
  },
];

async function sembrar(page: import("@playwright/test").Page, historial: unknown[] | null) {
  await page.addInitScript(
    ([clave, claveApodo, datos]) => {
      try {
        if (datos === null) window.localStorage.removeItem(clave);
        else window.localStorage.setItem(clave, JSON.stringify(datos));
        window.localStorage.setItem(claveApodo, "Ana");
      } catch {
        // almacenamiento bloqueado: la página debe seguir renderizando
      }
    },
    [CLAVE_INSIGNIAS, CLAVE_APODO, historial] as const,
  );
}

test("muestra medallas ganadas y bloqueadas a 360 px sin desbordar", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await sembrar(page, HISTORIAL);
  await page.goto("/mis-insignias");

  await expect(page.getByRole("heading", { name: "Mis insignias" })).toBeVisible();
  await expect(page.getByText("de Ana")).toBeVisible();
  await expect(page.getByText("2 de 6 insignias")).toBeVisible();

  // Ganadas: título, fecha de la primera vez en hora de Managua.
  await expect(page.getByText("Ronda perfecta", { exact: true })).toBeVisible();
  await expect(page.getByText("Rayo", { exact: true })).toBeVisible();
  await expect(page.getByText("Ganada el 18 de octubre de 2026")).toBeVisible();
  await expect(page.getByText("Ganada el 19 de octubre de 2026")).toBeVisible();

  // Bloqueadas: título y requisito.
  await expect(page.getByText("Cazador de contagios", { exact: true })).toBeVisible();
  await expect(page.getByText("Bloqueada", { exact: true })).toHaveCount(4);
  await expect(page.getByText(/Cómo ganarla: Aísla a todos los pacientes infectados/)).toBeVisible();

  const sinDesborde = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(sinDesborde).toBe(true);
});

test("sin insignias muestra el estado vacío con botón para jugar", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await sembrar(page, null);
  await page.goto("/mis-insignias");

  await expect(page.getByRole("heading", { name: "Aún no tienes insignias" })).toBeVisible();
  await expect(page.getByRole("link", { name: /¡Jugar ahora!/ })).toHaveAttribute("href", "/");
});

test("el inicio enlaza a mis insignias con la cuenta del apodo recordado", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await sembrar(page, HISTORIAL);
  await page.goto("/");

  const enlace = page.getByRole("link", { name: /Mis insignias/ });
  await expect(enlace).toHaveAttribute("href", "/mis-insignias");
  await expect(enlace).toContainText("2");
});
