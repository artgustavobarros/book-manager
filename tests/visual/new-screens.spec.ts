/**
 * Telas que não existem no standalone (feitas com os componentes do Design System):
 * snapshots próprios, comparados com a linha de base versionada (tolerância de 1%).
 * Gerar/atualizar a base: pnpm test:visual --update-snapshots
 */
import { expect, type Page, test } from "@playwright/test";

import { FIXED_NOW } from "../../playwright.config";
import { AUTH_STATE, chooseFirstSituation } from "../support/e2e";

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
  await expect(page).toHaveScreenshot(name + ".png", {
    animations: "disabled",
    caret: "hide",
  });
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
        await chooseFirstSituation(page, "Emprestado");
        await snap(page, `emprestado-para-quem-${vp.name}`);
      });

      test("toast de sucesso", async ({ page }) => {
        await prepare(page);
        await page.goto("/");
        await Promise.all([
          page.waitForEvent("download"),
          page.getByRole("button", { name: "Exportar Excel (CSV)" }).click(),
        ]);
        await expect(page.getByText("Planilha CSV exportada")).toBeVisible();
        await snap(page, `toast-sucesso-${vp.name}`);
      });

      test("toast de erro", async ({ page }) => {
        await prepare(page);
        await page.goto("/");
        const [chooser] = await Promise.all([
          page.waitForEvent("filechooser"),
          page.getByRole("button", { name: "Restaurar backup" }).click(),
        ]);
        await chooser.setFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from("isto não é json"),
        });
        await expect(
          page.getByText("Não foi possível restaurar o backup")
        ).toBeVisible();
        await snap(page, `toast-erro-${vp.name}`);
      });

      test("lista de nacionalidades da ficha", async ({ page }) => {
        await prepare(page);
        await page.goto("/estante");
        await page
          .getByRole("button", { name: "Registrar livro" })
          .last()
          .click();
        await page
          .getByRole("dialog")
          .getByLabel("Nacionalidade do autor")
          .click();
        await expect(
          page.getByRole("option", { name: "brasileira", exact: true })
        ).toBeVisible();
        await snap(page, `nacionalidades-${vp.name}`);
      });

      test("lista de gêneros do Me surpreenda", async ({ page }) => {
        await prepare(page);
        await page.goto("/");
        await page.evaluate(() => (Math.random = () => 0.42));
        await page.getByRole("button", { name: "Me surpreenda" }).click();
        await page.getByLabel("Sortear entre").click();
        await snap(page, `surpresa-generos-${vp.name}`);
      });
    });
  });
}
