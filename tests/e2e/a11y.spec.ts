import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

/**
 * Violações graves/críticas do axe (WCAG 2.1 AA) nas telas principais, nos dois temas.
 *
 * Inclui contraste de cores para impedir regressões nos dois temas.
 */
async function audit(page: Page) {
  // Contraste medido no fim das animações (modais entram com fade sobre o véu).
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (a) => a.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY
        )
        .map((a) => a.finished)
    )
  );
  const results = await new AxeBuilder({ page })
    // A prévia do card social é a imagem OG desenhada em escala (role="img" com descrição):
    // o texto miúdo dela não é lido como texto da página.
    .exclude("[data-og-preview]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes[0]?.target.join(" ")}`
    )
  ).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`acessibilidade · ${theme}`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([
        { name: "bodega-tema", value: theme, url: baseURL! },
      ]);
    });

    test("entrar", async ({ page }) => {
      await page.goto("/entrar");
      await audit(page);
    });

    test.describe("autenticado", () => {
      test.use({ storageState: AUTH_STATE });
      test.beforeEach(async ({ page }) => {
        await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      });

      for (const route of ["/", "/estante", "/estante?vista=lista", "/dados"]) {
        test(route, async ({ page }) => {
          await page.goto(route);
          await page.waitForTimeout(800);
          await audit(page);
        });
      }

      test("ficha e edição", async ({ page }) => {
        await page.goto("/estante");
        await page.getByText("Americanah", { exact: true }).nth(1).click();
        await audit(page);
        await page.getByRole("button", { name: "Editar ficha" }).click();
        await audit(page);
      });

      test("compartilhar e estante pública", async ({ page }) => {
        await page.goto("/");
        await page
          .getByRole("button", { name: "Compartilhar estante" })
          .first()
          .click();
        const dialog = page.getByRole("dialog", { name: "Compartilhar" });
        await audit(page);
        try {
          await dialog
            .getByRole("button", { name: "Publicar estante" })
            .click();
          await expect(dialog.getByLabel("Link da estante")).toBeVisible();
          // Audita o modal sem o toast de confirmação por cima (ele some sozinho).
          await expect(page.getByText("Estante publicada")).toBeHidden({
            timeout: 10_000,
          });
          await audit(page);
          await page.goto("/estante/ana-lima?genero=romance");
          await audit(page);
          await page.getByRole("button", { name: "Sortear para mim" }).click();
          await audit(page);
          await page.getByRole("button", { name: "Ver ficha" }).click();
          await expect(page.getByText("Da estante de Ana")).toBeVisible();
          await audit(page);
        } finally {
          await page.request.put("/api/public-shelf", {
            data: { enabled: false },
          });
        }
      });
    });
  });
}
