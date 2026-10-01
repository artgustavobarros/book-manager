import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

/**
 * Violações graves/críticas do axe (WCAG 2.1 AA) nas telas principais, nos dois temas.
 *
 * Exceção conhecida — `color-contrast`, decorrente dos tokens do design (mantidos por
 * fidelidade; ver "Open Questions" no design.md):
 * - claro: segmento inativo `--mute` sobre `--seg` = 4,4:1; contagem dos chips (opacidade .55) = 3,9:1
 * - escuro: avatar branco sobre `--acc` = 3,0:1; contagem do chip ativo = 3,5:1
 */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`acessibilidade · ${theme}`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{ name: "bodega-tema", value: theme, url: baseURL! }]);
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
    });
  });
}
