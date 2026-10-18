import { expect, test, type Page } from "@playwright/test";

/**
 * Evidencia visual de T1 v2 (S15): el armado del consultorio a los ~300 ms y
 * ~1200 ms, y la escena completa detrás de la primera tarjeta. Se corre en dos
 * anchos (390 móvil y 1280 escritorio); las imágenes quedan en test-results/.
 */
const SALIDAS = "test-results/consultorio-v2";

function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(e.message));
  return errores;
}

async function capturarFlujo(page: Page, nombre: string) {
  const errores = vigilarErrores(page);
  await page.goto("/");
  await page.getByLabel("Tu apodo").fill("Capturas");
  await page.getByRole("button", { name: "¡Empezar turno!" }).click();
  await expect(page).toHaveURL(/\/jugar/);

  // Armado en curso: el aviso visible prueba que la tarjeta espera a la escena.
  await expect(page.getByText("Armando el consultorio…")).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SALIDAS}/${nombre}-armado-300ms.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SALIDAS}/${nombre}-armado-1200ms.png` });

  // Primera tarjeta con la escena completa detrás: se deja asentar la
  // entrada de la tarjeta para no atraparla a medio fundido.
  await expect(page.getByRole("slider")).toBeVisible();
  await expect(page.getByText("Armando el consultorio…")).toBeHidden();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SALIDAS}/${nombre}-primer-paciente.png` });

  expect(errores).toEqual([]);
}

test("escena 390px: armado y primer paciente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await capturarFlujo(page, "390");
});

test("escena 1280px: armado y primer paciente", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await capturarFlujo(page, "1280");
});
