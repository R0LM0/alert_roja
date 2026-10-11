import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Los specs de Playwright viven en e2e/ y se corren con `npm run test:e2e`.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
