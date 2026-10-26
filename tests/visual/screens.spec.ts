/**
 * Telas e modais do app (ver CASES em tests/support/visual-cases.ts): snapshots
 * comparados com a linha de base versionada (tolerância de 1%), nos dois viewports
 * e nos dois temas.
 * Gerar/atualizar a base: pnpm test:visual --update-snapshots
 */
import { expect, test } from "@playwright/test";

import { CASES, openApp, THEMES, VIEWPORTS } from "../support/visual-cases";

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const c of CASES) {
      test(`${c.name} · ${vp.name} · ${theme}`, async ({ browser }) => {
        const app = await openApp(browser, c, vp, theme);
        await expect(app.page).toHaveScreenshot(
          `${c.name}-${vp.name}-${theme}.png`,
          { animations: "disabled", caret: "hide" }
        );
        await app.close();
      });
    }
  }
}
