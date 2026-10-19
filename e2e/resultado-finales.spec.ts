import { expect, test, type Page } from "@playwright/test";

/**
 * Finales de /resultado (T6): el veredicto de la ciudad depende de las decisiones.
 * Se siembra el resultado en sessionStorage para forzar cada desenlace y se
 * guardan capturas de ambos en test-results/.
 */
const CLAVE = "alerta-roja:resultado";
const SALIDAS = "test-results/consultorio-3d";

const NOMBRES = [
  "Ana Uno",
  "Beto Dos",
  "Cami Tres",
  "Dante Cuatro",
  "Eva Cinco",
  "Fito Seis",
  "Gabi Siete",
  "Hugo Ocho",
  "Iris Nueve",
  "Juan Diez",
];

/** Tres infectados (posiciones 3, 7 y 9); el resto sanos. */
const INFECTADOS = [3, 7, 9];

/** La evidencia es obligatoria en la ronda guardada: se rota entre las cinco. */
const EVIDENCIAS = ["conviviente", "contacto", "sintomas", "sin-antecedentes", "protegido"] as const;

function armar(liberarInfectado: boolean) {
  const ronda = NOMBRES.map((nombre, i) => ({
    orden: i + 1,
    nombre,
    seed: `semilla-${i}`,
    evidencia: EVIDENCIAS[i % EVIDENCIAS.length],
    estaba_infectado: INFECTADOS.includes(i + 1),
  }));
  const respuestas = ronda.map((r) => ({
    orden: r.orden,
    estimacion_pct: null,
    decision: r.estaba_infectado ? (liberarInfectado && r.orden === 3 ? "liberar" : "aislar") : "liberar",
    estaba_infectado: r.estaba_infectado,
    tiempo_ms: 3000,
  }));
  return { jugador: "Finales", modo: "normal", ronda, respuestas, estado: "pendiente" };
}

async function sembrarYVer(page: Page, liberarInfectado: boolean) {
  await page.goto("/");
  await page.evaluate(
    ([clave, data]) => window.sessionStorage.setItem(clave, JSON.stringify(data)),
    [CLAVE, armar(liberarInfectado)] as const,
  );
  await page.goto("/resultado");
  await expect(page.getByRole("heading", { name: "Turno terminado, Finales" })).toBeVisible();
}

test("final brote: liberar un infectado contagia la ciudad", async ({ page }) => {
  await sembrarYVer(page, true);
  await expect(page.getByText("La ciudad se contagió")).toBeVisible();
  await expect(page.getByText(/Liberaste 1 paciente infectado/)).toBeVisible();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SALIDAS}/390-final-brote.png`, fullPage: true });
  await page.locator('[data-testid="veredicto-ciudad"]').screenshot({ path: `${SALIDAS}/detalle-final-brote.png` });
  // El análisis del teorema sigue debajo del veredicto.
  await expect(page.getByText("La fórmula de Bayes, paso a paso")).toBeVisible();
});

test("final salvada: aislar a todos los infectados salva la ciudad", async ({ page }) => {
  await sembrarYVer(page, false);
  await expect(page.getByText("La ciudad está a salvo")).toBeVisible();
  await expect(page.getByText(/no se escapó ninguno/)).toBeVisible();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SALIDAS}/390-final-salvada.png`, fullPage: true });
  await page.locator('[data-testid="veredicto-ciudad"]').screenshot({ path: `${SALIDAS}/detalle-final-salvada.png` });
  await expect(page.getByText("La fórmula de Bayes, paso a paso")).toBeVisible();
});
