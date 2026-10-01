/**
 * Telas que não existem no standalone (feitas com os componentes do Design System):
 * snapshots próprios, comparados com a linha de base versionada (tolerância de 1%).
 * Gerar/atualizar a base: pnpm test:visual --update-snapshots
 */
import { expect, test, type Page } from "@playwright/test";

import { FIXED_NOW } from "../../playwright.config";
import { AUTH_STATE } from "../support/e2e";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
}

async function snap(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot(name + ".png", { animations: "disabled", caret: "hide" });
}

for (const vp of VIEWPORTS) {
  test.describe(`telas novas · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("verifique seu e-mail", async ({ page }) => {
      await prepare(page);
      await page.goto("/verifique-email?email=bia%40exemplo.com");
      await snap(page, `verifique-email-${vp.name}`);
    });

    test("link de verificação inválido", async ({ page }) => {
      await prepare(page);
      await page.goto("/verifique-email?error=INVALID_TOKEN");
      await snap(page, `verifique-email-invalido-${vp.name}`);
    });

    test("esqueci minha senha", async ({ page }) => {
      await prepare(page);
      await page.goto("/esqueci-senha");
      await snap(page, `esqueci-senha-${vp.name}`);
    });

    test("nova senha", async ({ page }) => {
      await prepare(page);
      await page.goto("/redefinir-senha?token=abc");
      await snap(page, `nova-senha-${vp.name}`);
    });

    test.describe("autenticado", () => {
      test.use({ storageState: AUTH_STATE });

      test("minha conta", async ({ page }) => {
        await prepare(page);
        await page.goto("/");
        await page.getByRole("button", { name: "Minha conta" }).click();
        await snap(page, `minha-conta-${vp.name}`);
      });

      test("emprestado para quem?", async ({ page }) => {
        await prepare(page);
        await page.goto("/estante?q=frankenstein");
        await page.getByRole("combobox", { name: "Status" }).first().selectOption("emprestado");
        await snap(page, `emprestado-para-quem-${vp.name}`);
      });
    });
  });
}
