import { expect, test, type Page, type Request } from "@playwright/test";

const PACIENTES = 10;
const PUNTAJE_SIMULADO = 777;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Cuerpo = {
  id?: string;
  jugador: string;
  prevalencia: number;
  respuestas: { orden: number; estimacion_pct: number; decision: string; estaba_infectado: boolean }[];
};

/** Errores de consola y de página (las advertencias de WebGL/three se permiten). */
function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(e.message));
  return errores;
}

/** Intercepta el guardado: no escribe en la base y deja inspeccionar lo que envía el cliente. */
async function simularGuardado(page: Page): Promise<() => Request> {
  let ultima: Request | undefined;
  await page.route("**/api/partidas", async (route) => {
    ultima = route.request();
    const cuerpo = route.request().postDataJSON() as Cuerpo;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: cuerpo.id, puntaje: PUNTAJE_SIMULADO }),
    });
  });
  return () => {
    if (!ultima) throw new Error("La app no envió POST /api/partidas");
    return ultima;
  };
}

/** Juega los 10 pacientes por los controles reales: slider con teclado + botones. */
async function jugarRonda(page: Page): Promise<{ estimaciones: number[]; decisiones: string[] }> {
  await page.getByRole("button", { name: "Sin tiempo" }).click();
  const estimaciones: number[] = [];
  const decisiones: string[] = [];
  for (let i = 0; i < PACIENTES; i++) {
    await expect(page.getByText(`Paciente ${i + 1} de ${PACIENTES}`)).toBeAttached();
    const estimacion = 10 * (i % 5) + 10; // 10, 20, 30, 40, 50, 10, ...
    const slider = page.getByRole("slider");
    await slider.focus();
    await slider.press("Home");
    for (let k = 0; k < estimacion / 10; k++) await slider.press("PageUp");
    await expect(slider).toHaveAttribute("aria-valuenow", String(estimacion));

    const decision = i % 2 === 0 ? "Aislar" : "Liberar";
    estimaciones.push(estimacion);
    decisiones.push(decision.toLowerCase());
    await page.getByRole("button", { name: decision, exact: true }).click();
  }
  return { estimaciones, decisiones };
}

async function empezar(page: Page, boton: string | RegExp) {
  await page.goto("/");
  await page.getByLabel("Tu apodo").fill("Tester E2E");
  await page.getByRole("button", { name: boton }).click();
  await expect(page).toHaveURL(/\/jugar/);
}

test("una ronda completa en el celular: de la portada a la revelación", async ({ page }) => {
  const errores = vigilarErrores(page);
  const peticion = await simularGuardado(page);

  await empezar(page, "¡Empezar turno!");

  // Primer paciente: nada revela si está infectado (la verdad llega al final).
  await expect(page.getByRole("slider")).toBeVisible();
  const textoJuego = (await page.locator("main").innerText()).toLowerCase();
  expect(textoJuego).not.toMatch(/estaba (infectado|sano)|1 de cada|decisión (acertada|errada)/);
  expect(await page.locator("main").innerHTML()).not.toMatch(/estaba_infectado/);

  const { estimaciones, decisiones } = await jugarRonda(page);

  // Lo que se envió al servidor.
  await expect(page).toHaveURL(/\/resultado/);
  const cuerpo = peticion().postDataJSON() as Cuerpo;
  expect(cuerpo.id).toMatch(UUID);
  expect(cuerpo.jugador).toBe("Tester E2E");
  expect(cuerpo.prevalencia).toBe(0.1);
  expect(cuerpo.respuestas).toHaveLength(PACIENTES);
  expect(cuerpo.respuestas.map((r) => r.orden)).toEqual(Array.from({ length: PACIENTES }, (_, i) => i + 1));
  expect(cuerpo.respuestas.map((r) => r.decision)).toEqual(decisiones);
  expect(cuerpo.respuestas.map((r) => r.estimacion_pct)).toEqual(estimaciones);
  expect(cuerpo.respuestas.every((r) => ["aislar", "liberar"].includes(r.decision))).toBe(true);

  // Revelación.
  await expect(page.getByText("La prueba acierta 90 %, pero solo 1 de cada 3 positivos está enfermo")).toBeVisible();
  await expect(page.getByText(/Tu intuición:\s*\d+ %\s*·\s*Realidad:\s*33 %/)).toBeVisible();
  await expect(page.getByText(String(PUNTAJE_SIMULADO), { exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`puntos · \\d+ de ${PACIENTES} pacientes`))).toBeVisible();
  await expect(page.getByText("La fórmula de Bayes, paso a paso")).toBeVisible();

  const tabla = page.getByRole("table", { name: /Tabla 2x2/ });
  await expect(tabla).toBeVisible();
  for (const n of ["90", "180", "10", "720"]) await expect(tabla.getByText(n, { exact: true })).toBeVisible();

  // Sin scroll horizontal en 360 px.
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho).toBeLessThanOrEqual(visible);

  // Las fórmulas KaTeX caben en su caja (sin scroll interno) en 360 px.
  const desbordes = await page.evaluate(() =>
    [...document.querySelectorAll(".katex-display")]
      .map((f) => f.parentElement!)
      .filter((caja) => caja.scrollWidth > caja.clientWidth + 1).length,
  );
  expect(desbordes).toBe(0);

  expect(errores).toEqual([]);
});

test("modo experto: el mensaje clave cambia a 1 de cada 23", async ({ page }) => {
  const errores = vigilarErrores(page);
  const peticion = await simularGuardado(page);

  await empezar(page, /Modo experto/);
  await jugarRonda(page);

  await expect(page).toHaveURL(/\/resultado/);
  expect((peticion().postDataJSON() as Cuerpo).prevalencia).toBe(0.01);
  await expect(page.getByText("La prueba acierta 90 %, pero solo 1 de cada 23 positivos está enfermo")).toBeVisible();
  const tabla = page.getByRole("table", { name: /Tabla 2x2/ });
  for (const n of ["9", "198", "1", "792"]) await expect(tabla.getByText(n, { exact: true })).toBeVisible();
  expect(errores).toEqual([]);
});

test("sonido ya activado en visitas previas: sin errores de hidratación", async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.addInitScript(() => window.localStorage.setItem("alerta-roja:silenciado", "0"));

  await page.goto("/");
  const boton = page.locator("button[data-sin-sonido]");
  // Tras montar aplica la preferencia guardada (sonido activado).
  await expect(boton).toHaveAttribute("aria-pressed", "true");
  expect(errores).toEqual([]);
});
