import { expect, test } from "@playwright/test";

/**
 * /podio sin clave o con clave incorrecta: responde el mensaje 401 sin consultar la base,
 * así que corre sin DB. El podio con datos (y el botón Revelar) necesita la base y se prueba a mano.
 */
test.describe("podio sin acceso", () => {
  test("sin ?key= muestra el mensaje de acceso no autorizado", async ({ page }) => {
    await page.goto("/podio");
    await expect(page.getByRole("heading", { name: /401/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Revelar/ })).toHaveCount(0);
  });

  test("con clave incorrecta no muestra el podio", async ({ page }) => {
    await page.goto("/podio?key=clave-que-no-existe");
    await expect(page.getByRole("heading", { name: /401/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Podio/ })).toHaveCount(0);
  });

  test("el mensaje cabe en 360 px sin desborde horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/podio");
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
