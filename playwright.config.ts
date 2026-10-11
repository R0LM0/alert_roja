import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3116;
const URL_BASE = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: URL_BASE,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 360, height: 740 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  // Siempre contra el build de producción (lo que se despliega).
  webServer: {
    command: `npm run build && npm run start -- -p ${PUERTO}`,
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
