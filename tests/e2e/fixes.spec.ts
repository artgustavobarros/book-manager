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

    test("falha ao mudar o status de um livro não desfaz a mudança feita em outro", async ({
      page,
    }) => {
      await page.goto("/estante?vista=lista");
      const covers = page.locator("[data-bid]");
      const [idA, idB] = await Promise.all([
        covers.nth(0).getAttribute("data-bid"),
        covers.nth(1).getAttribute("data-bid"),
      ]);
      const cycle = (id: string | null) =>
        page
          .locator(`[data-bid="${id}"]`)
          .locator("..")
          .getByRole("button", {
            name: /^(Começar a ler|Concluir leitura|Marcar como não lido)$/,
          });
      const label = async (id: string | null) =>
        (await cycle(id).getAttribute("aria-label")) ?? "";
      const [beforeA, beforeB] = [await label(idA), await label(idB)];

      // Segura o PATCH de A até B já ter sido salvo, e então responde com erro.
      let release!: () => void;
      const held = new Promise<void>((r) => {
        release = r;
      });
      await page.route(new RegExp(`/api/books/${idA}$`), async (r) => {
        if (r.request().method() !== "PATCH") {
          return r.fallback();
        }
        await held;
        await r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falhou de propósito." }),
        });
      });

      await cycle(idA).click();
      await expect(cycle(idA)).not.toHaveAttribute("aria-label", beforeA);

      const savedB = page.waitForResponse(
        (r) => r.url().endsWith(`/api/books/${idB}`) && r.ok()
      );
      await cycle(idB).click();
      await savedB;
      const afterB = await label(idB);
      expect(afterB).not.toBe(beforeB);

      release();
      await expect(page.getByText("Falhou de propósito.")).toBeVisible();
      await expect(cycle(idA)).toHaveAttribute("aria-label", beforeA);
      await expect(cycle(idB)).toHaveAttribute("aria-label", afterB);
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
      "/icon.png",
      "/apple-icon.png",
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
    await expect(page.locator('link[rel="icon"]')).toHaveCount(2);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f4eee3"
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
    expect(box!.height).toBeLessThanOrEqual(136);
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

  for (const width of [320, 390, 640]) {
    test(`Estante em duas colunas a ${width}px, com ações acessíveis`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/estante");
      const cards = page.locator("[data-bid]");
      await expect(cards.nth(1)).toBeVisible();
      const [a, b] = [
        await cards.nth(0).boundingBox(),
        await cards.nth(1).boundingBox(),
      ];
      expect(Math.abs(b!.y - a!.y)).toBeLessThanOrEqual(1);
      expect(b!.x).toBeGreaterThan(a!.x + a!.width);
      expect(b!.width).toBeCloseTo(a!.width, 0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);

      const firstCard = cards.first().locator("..");
      const favorite = firstCard.getByRole("button", { name: /favoritos/ });
      const status = firstCard.getByRole("combobox", { name: "Status" });
      const cycle = firstCard
        .getByRole("button", {
          name: /Começar a ler|Concluir leitura|Marcar como não lido/,
        })
        .last();
      await expect(favorite).toBeVisible();
      await expect(status).toBeVisible();
      await expect(cycle).toBeVisible();
      const cardBox = await firstCard.boundingBox();
      for (const control of [status, cycle]) {
        const box = await control.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(
          cardBox!.x + cardBox!.width + 1
        );
      }
    });
  }

  test("Estante volta ao grid automático acima de 640px", async ({ page }) => {
    await page.setViewportSize({ width: 641, height: 844 });
    await page.goto("/estante");
    const cards = page.locator("[data-bid]");
    await expect(cards.nth(2)).toBeVisible();
    const columns = await cards
      .first()
      .locator("../..")
      .evaluate((grid) =>
        getComputedStyle(grid).gridTemplateColumns.split(" ")
      );
    expect(columns).toHaveLength(3);
  });
});

test.describe("tempo do empréstimo (BP-06)", () => {
  test.use({ storageState: AUTH_STATE });

  test("favoritar e editar as anotações não reiniciam a contagem", async ({
    page,
  }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    // Dom Casmurro foi emprestado 5 dias antes de FIXED_NOW (fixture de referência).
    const badge = page.getByText(/Com Ana · há 5 dias/).first();
    await page.goto("/estante?q=dom casmurro");
    await expect(badge).toBeVisible();

    // As ações da capa só aparecem no hover (desktop).
    const cover = page.locator("[data-bid]").first();
    await cover.hover();
    await cover
      .locator("..")
      .getByRole("button", { name: /favoritos/ })
      .click();
    await expect(
      page.getByText(/(Adicionado aos|Removido dos) favoritos/)
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Dom Casmurro", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Editar ficha" }).click();
    await dialog.getByLabel("Anotações pessoais").fill("Cobrar na sexta.");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Alterações salvas")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(badge).toBeVisible();

    await page.goto("/");
    await page.getByText("Emprestados").click();
    await expect(
      page.getByRole("dialog").getByText(/Com Ana · há 5 dias/)
    ).toBeVisible();
  });
});
