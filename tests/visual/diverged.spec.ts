/**
 * Telas que divergem de propósito do standalone do design (ver DIVERGED em
 * tests/support/visual-cases.ts): snapshots próprios, comparados com a linha de base
 * versionada (tolerância de 1%), como as telas novas.
 * Gerar/atualizar a base: pnpm test:visual --update-snapshots
 */
import { expect, test } from "@playwright/test";

import {
  CASES,
  DIVERGED,
  openApp,
  THEMES,
  VIEWPORTS,
} from "../support/visual-cases";

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const c of CASES) {
      if (!DIVERGED.has(`${c.name}/${vp.name}`)) {
        continue;
      }
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
