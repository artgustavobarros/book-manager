/**
 * Casos das capturas visuais (compartilhados por oracle.spec.ts e diverged.spec.ts):
 * telas, viewports, temas e como abrir cada caso no app.
 */
import { type Browser, type Page, test } from "@playwright/test";

import { FIXED_NOW } from "../../playwright.config";
import { AUTH_STATE } from "./e2e";

export const EXTERNAL = /^https?:\/\/(?!localhost)/;

export type Theme = "light" | "dark";
export type Viewport = { name: string; width: number; height: number };
export const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
export const THEMES: Theme[] = ["light", "dark"];

export interface Case {
  /** Ação executada igualmente nos dois (mesmos rótulos acessíveis). */
  act?: (page: Page) => Promise<void>;
  authed?: boolean;
  name: string;
  /** Rota do app e aba do standalone ("Painel" é o padrão nos dois). */
  route: string;
  tab?: "Estante" | "Dados do acervo";
}

const openFicha = async (page: Page) => {
  await page.getByText("Americanah", { exact: true }).nth(1).click();
};

export const CASES: Case[] = [
  { name: "entrar", route: "/entrar", authed: false },
  { name: "painel", route: "/" },
  { name: "estante", route: "/estante", tab: "Estante" },
  {
    name: "estante-lista",
    route: "/estante",
    tab: "Estante",
    act: (p) => p.getByRole("button", { name: "Lista", exact: true }).click(),
  },
  {
    name: "estante-filtro",
    route: "/estante",
    tab: "Estante",
    act: (p) => p.getByRole("button", { name: /^Emprestados/ }).click(),
  },
  { name: "dados", route: "/dados", tab: "Dados do acervo" },
  { name: "ficha", route: "/estante", tab: "Estante", act: openFicha },
  {
    name: "edicao",
    route: "/estante",
    tab: "Estante",
    act: async (p) => {
      await openFicha(p);
      await p.getByRole("button", { name: "Editar ficha" }).click();
    },
  },
  {
    name: "surpresa",
    route: "/",
    act: async (p) => {
      await p.evaluate(() => (Math.random = () => 0.42));
      await p.getByRole("button", { name: "Me surpreenda" }).click();
    },
  },
  {
    name: "planilha",
    route: "/",
    act: (p) => p.getByRole("button", { name: "Sincronizar planilha" }).click(),
  },
];

export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

export async function openApp(
  browser: Browser,
  c: Case,
  vp: Viewport,
  theme: Theme
) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    storageState: c.authed === false ? undefined : AUTH_STATE,
  });
  await ctx.addCookies([
    {
      name: "bodega-tema",
      value: theme,
      url: test.info().project.use.baseURL!,
    },
  ]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.route(EXTERNAL, (r) => r.abort());
  await page.goto(c.route);
  await settle(page);
  if (c.act) {
    await c.act(page);
  }
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  return { page, close: () => ctx.close() };
}

/**
 * Casos que divergem de propósito do standalone em design/handoff (change
 * fix-bugs-seo-mobile, layout do design de 2026-10-02): saem do oráculo e passam a ter
 * baselines próprias em diverged.spec.ts.
 * - mobile: header compacto não fixo, botões flutuantes e Estante em 1 coluna.
 * - estante/desktop: sem o selo de status sobre a capa.
 */
export const DIVERGED = new Set([
  "estante/desktop",
  "painel/mobile",
  "estante/mobile",
  "estante-lista/mobile",
  "estante-filtro/mobile",
  "dados/mobile",
  "ficha/mobile",
  "surpresa/mobile",
  "planilha/mobile",
]);
