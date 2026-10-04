import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/** Instante fixo dos testes (servidor via FIXED_NOW, navegador via page.clock). */
export const FIXED_NOW = "2026-06-15T15:00:00-03:00";

/**
 * - e2e: fluxos funcionais contra a build de produção, com banco PGlite descartável.
 * - visual: compara o app com o standalone do design (oráculo), ver tests/visual.
 */
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [
    // Faz login uma vez com o usuário de referência (evita o rate limit do /sign-in).
    { name: "setup", testMatch: "setup/**/*.setup.ts" },
    {
      name: "e2e",
      testMatch: "e2e/**/*.spec.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "visual",
      testMatch: "visual/**/*.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bash scripts/e2e-server.sh ${PORT}`,
    url: baseURL + "/entrar",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "pglite://./.data/e2e",
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0000",
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      EMAIL_TRANSPORT: "outbox",
      EMAIL_OUTBOX_FILE: ".data/outbox-e2e.jsonl",
      FIXED_NOW,
    },
  },
});
