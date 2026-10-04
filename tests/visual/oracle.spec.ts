/**
 * Fidelidade visual: cada tela do app é capturada lado a lado com o standalone do design
 * (design/handoff/Bodega Literária.html), com o mesmo acervo, a mesma data, a rede externa
 * bloqueada e as animações finalizadas. A diferença precisa ficar abaixo de 1% dos pixels.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { type Browser, expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import { FIXED_NOW } from "../../playwright.config";
import { REFERENCE_USER } from "../support/e2e";
import {
  CASES,
  type Case,
  DIVERGED,
  EXTERNAL,
  openApp,
  settle,
  THEMES,
  type Theme,
  VIEWPORTS,
  type Viewport,
} from "../support/visual-cases";

const ORACLE = "file://" + path.resolve("design/handoff/Bodega Literária.html");
const MAX_DIFF = 0.01;

/**
 * Desvios intencionais em relação ao standalone, com o motivo. Fora destes, vale 1%.
 * - edicao/mobile: o campo novo "Cor/etnia do autor(a)" divide a linha da Editora
 *   (no grid de 2 colunas isso desloca os campos seguintes).
 */
const KNOWN_DEVIATIONS: Record<string, number> = {
  "edicao/mobile": 0.02,
};

async function openOracle(
  browser: Browser,
  c: Case,
  vp: Viewport,
  theme: Theme
) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  await ctx.addInitScript(
    ({ theme, authed, user }) => {
      if (authed) {
        sessionStorage.setItem("acervo-sessao", "1");
      }
      localStorage.setItem("acervo-usuario", JSON.stringify(user));
      localStorage.setItem("acervo-tema", theme);
    },
    {
      theme,
      authed: c.authed !== false,
      user: { name: REFERENCE_USER.name, email: REFERENCE_USER.email },
    }
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.route(EXTERNAL, (r) => r.abort());
  await page.goto(ORACLE);
  await page.waitForFunction(
    () => !document.getElementById("__bundler_loading")
  );
  await settle(page);
  if (c.tab) {
    await page
      .getByRole("button", { name: c.tab, exact: true })
      .first()
      .click();
    await settle(page);
  }
  if (c.act) {
    await c.act(page);
  }
  await settle(page);
  // O clique do Playwright pode rolar a página do standalone; o app abre no topo.
  await page.evaluate(() => window.scrollTo(0, 0));
  return { page, close: () => ctx.close() };
}

function diffRatio(a: Buffer, b: Buffer): { ratio: number; diff: Buffer } {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  const w = Math.min(A.width, B.width);
  const h = Math.min(A.height, B.height);
  const crop = (img: PNG) => {
    const o = new PNG({ width: w, height: h });
    PNG.bitblt(img, o, 0, 0, w, h, 0, 0);
    return o;
  };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, {
    threshold: 0.1,
  });
  return { ratio: n / (w * h), diff: PNG.sync.write(d) };
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const c of CASES) {
      // Divergências intencionais têm baseline própria (diverged.spec.ts).
      if (DIVERGED.has(`${c.name}/${vp.name}`)) {
        continue;
      }
      test(`${c.name} · ${vp.name} · ${theme}`, async ({ browser }, info) => {
        const app = await openApp(browser, c, vp, theme);
        const oracle = await openOracle(browser, c, vp, theme);
        const shotApp = await app.page.screenshot({
          animations: "disabled",
          caret: "hide",
        });
        const shotOracle = await oracle.page.screenshot({
          animations: "disabled",
          caret: "hide",
        });
        await app.close();
        await oracle.close();
        const { ratio, diff } = diffRatio(shotApp, shotOracle);
        // VISUAL_SAVE_ALL=1 grava as capturas mesmo quando passam (útil para inspecionar).
        if (
          ratio > (KNOWN_DEVIATIONS[`${c.name}/${vp.name}`] ?? MAX_DIFF) ||
          process.env.VISUAL_SAVE_ALL
        ) {
          for (const [name, body] of [
            ["app.png", shotApp],
            ["standalone.png", shotOracle],
            ["diff.png", diff],
          ] as const) {
            await writeFile(info.outputPath(name), body);
            await info.attach(name, { body, contentType: "image/png" });
          }
        }
        const max = KNOWN_DEVIATIONS[`${c.name}/${vp.name}`] ?? MAX_DIFF;
        expect(
          ratio,
          `diferença de ${(ratio * 100).toFixed(2)}% em relação ao standalone`
        ).toBeLessThanOrEqual(max);
      });
    }
  }
}
