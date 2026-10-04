import { expect, type Page, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

/** Correções da change fix-bugs-seo-mobile: bugs, SEO, teclado e layout mobile. */

const CATALOGS =
  /itunes\.apple\.com|googleapis\.com|openlibrary\.org|amazon\.com/;

/** Responde com erro às chamadas de livros que casam com o método. */
async function failBooksApi(page: Page, method: "PATCH" | "DELETE") {
  await page.route(/\/api\/books\/[^/]+$/, (r) =>
    r.request().method() === method
      ? r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falhou de propósito." }),
        })
      : r.fallback()
  );
}

test.describe("acervo (desktop)", () => {
  test.use({ storageState: AUTH_STATE });
  test.describe.configure({ mode: "serial" });

  test("capas automáticas são buscadas para os livros já visíveis, sem rolar", async ({
    page,
  }) => {
    const lookups: string[] = [];
    page.on("request", (r) => CATALOGS.test(r.url()) && lookups.push(r.url()));
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await page.goto("/estante");
    await expect
      .poll(() => lookups.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
  });

  test.describe("com a rede externa bloqueada", () => {
    test.beforeEach(async ({ page }) => {
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    });

    test("a ficha abre pelo teclado a partir do título na Estante", async ({
      page,
    }) => {
      await page.goto("/estante?q=kindred");
      await page.getByRole("button", { name: "Kindred", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("dialog").getByRole("heading", { name: "Kindred" })
      ).toBeVisible();
    });

    test("falha ao salvar a edição mantém o modal aberto e não mostra sucesso", async ({
      page,
    }) => {
      await page.goto("/estante?q=kindred");
      await page.getByRole("button", { name: "Kindred", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Editar ficha" })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Título *").fill("Kindred editado");
      await failBooksApi(page, "PATCH");
      await dialog.getByRole("button", { name: "Salvar" }).click();

      await expect(page.getByText("Falhou de propósito.")).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Editar ficha" })
      ).toBeVisible();
      await expect(dialog.getByLabel("Título *")).toHaveValue(
        "Kindred editado"
      );
      await expect(page.getByText("Alterações salvas")).toHaveCount(0);
    });

    test("falha ao excluir devolve o livro e não mostra sucesso", async ({
      page,
    }) => {
      await page.goto("/estante?q=kindred&vista=lista");
      await failBooksApi(page, "DELETE");
      await page.getByRole("button", { name: "Excluir", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Excluir" })
        .click();

      await expect(page.getByText("Falhou de propósito.")).toBeVisible();
      await expect(page.getByText("Livro excluído")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Kindred", exact: true })
      ).toBeVisible();
    });

    test("rota inexistente mostra o 404 próprio com link para o Painel", async ({
      page,
    }) => {
      const res = await page.goto("/nao-existe");
      expect(res?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "Página não encontrada" })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Voltar ao Painel" })
      ).toHaveAttribute("href", "/");
    });
  });
});

test.describe("SEO (sem sessão)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("robots, sitemap, ícones, manifest e imagem OG respondem sem redirecionar", async ({
    request,
    baseURL,
  }) => {
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
      "/apple-icon",
      "/opengraph-image",
      "/manifest.webmanifest",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`<loc>${baseURL}/entrar</loc>`);
    expect(sitemap.match(/<loc>/g)).toHaveLength(1);
    expect(await (await request.get("/robots.txt")).text()).toMatch(
      /Disallow: \/\n/
    );
  });

  test("a entrada é indexável e tem metadados de compartilhamento", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await expect(page).toHaveTitle("Entrar · Bodega Literária");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /^https?:\/\/.+\/opengraph-image/
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f4f2ee"
    );
  });

  test("páginas de token não são indexáveis", async ({ page }) => {
    for (const path of [
      "/redefinir-senha",
      "/verifique-email",
      "/esqueci-senha",
    ]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute(
        "content",
        "noindex, nofollow"
      );
    }
  });

  test("?voltar= com barra invertida cai no Painel em vez de quebrar o login", async ({
    page,
  }) => {
    await page.goto("/entrar?voltar=/%5Cevil.com");
    await page.getByLabel("E-mail").fill("ana@exemplo.com");
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("layout mobile", () => {
  test.use({
    storageState: AUTH_STATE,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  });

  test("header compacto e não fixo", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header:visible");
    await expect(header).toHaveCount(1);
    const box = await header.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(130);
    expect(await header.evaluate((e) => getComputedStyle(e).position)).not.toBe(
      "sticky"
    );
    await expect(
      page.getByRole("button", { name: "+ Registrar livro" })
    ).toHaveCount(0);
  });

  test("botões flutuantes somem ao rolar para baixo e voltam ao rolar para cima", async ({
    page,
  }) => {
    await page.goto("/estante");
    const fabs = page.locator('[data-slot="mobile-fabs"]');
    const add = page.getByRole("button", {
      name: "Registrar livro",
      exact: true,
    });
    await expect(add).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 300);
    }
    await expect(fabs).toHaveAttribute("data-hidden", "true");
    await expect(add).toBeHidden();

    await page.mouse.wheel(0, -200);
    await expect(fabs).not.toHaveAttribute("data-hidden", "true");
    await expect(add).toBeVisible();
  });

  test("busca abre, recolhe sem perder o filtro e limpa em ação separada", async ({
    page,
  }) => {
    await page.goto("/estante");
    await page.getByRole("button", { name: "Abrir busca" }).click();
    await expect(
      page.getByRole("textbox", { name: "Buscar no acervo" })
    ).toBeFocused();
    await page.keyboard.type("kindred");
    await expect(page.getByText(/^1 de \d+ livros$/)).toBeVisible();
    await page.getByRole("button", { name: "Recolher busca" }).click();
    await expect(
      page.getByRole("textbox", { name: "Buscar no acervo" })
    ).toHaveCount(0);
    await expect(page.getByText(/Busca: kindred/)).toBeVisible();
    await expect(page).toHaveURL(/q=kindred/);
    await page.getByRole("button", { name: "Abrir busca" }).click();
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await expect(page.getByText(/^\d+ livros$/)).toBeVisible();
  });

  test("Estante em uma coluna, sem selo sobre a capa e com ações visíveis", async ({
    page,
  }) => {
    await page.goto("/estante");
    const cards = page.locator("[data-bid]");
    const [a, b] = [
      await cards.nth(0).boundingBox(),
      await cards.nth(1).boundingBox(),
    ];
    expect(b!.y).toBeGreaterThan(a!.y + a!.height);
    await expect(
      cards.first().getByRole("button", { name: /favoritos/ })
    ).toBeVisible();
  });
});
