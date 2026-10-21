import { expect, type Page, test } from "@playwright/test";

import referenceBooks from "../fixtures/reference-books.json";
import { AUTH_STATE, chooseFirstStatus } from "../support/e2e";

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
    const restore = await page.request.post("/api/books/import", {
      data: referenceBooks,
    });
    expect(restore.ok()).toBe(true);
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

      // B não entra na fila de A: o PATCH de B sai e responde com A ainda segurado.
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

    test("duas edições seguidas no mesmo livro vão em ordem e a primeira resposta não desfaz a segunda", async ({
      page,
    }) => {
      await page.goto("/estante");
      const id = await page
        .locator("[data-bid]")
        .first()
        .getAttribute("data-bid");
      const cover = page.locator(`[data-bid="${id}"]`);
      // As ações da capa só aparecem com o mouse sobre ela.
      await cover.hover();
      const fav = cover.getByRole("button", { name: /(aos|dos) favoritos$/ });
      const before = (await fav.getAttribute("aria-label")) ?? "";

      // Cada PATCH chega ao servidor na hora, mas a resposta só volta quando liberada.
      const sent: unknown[] = [];
      const releases: (() => void)[] = [];
      const gates = [0, 1].map(
        () => new Promise<void>((r) => releases.push(r))
      );
      await page.route(new RegExp(`/api/books/${id}$`), async (r) => {
        if (r.request().method() !== "PATCH") {
          return r.fallback();
        }
        const n = sent.push(r.request().postDataJSON());
        const response = await r.fetch();
        await gates[n - 1];
        await r.fulfill({ response });
      });

      await fav.click();
      await expect(fav).not.toHaveAttribute("aria-label", before);
      await fav.click();
      await expect(fav).toHaveAttribute("aria-label", before);

      // O segundo PATCH espera a resposta do primeiro.
      await page.waitForTimeout(300);
      expect(sent).toHaveLength(1);

      releases[0]();
      await expect.poll(() => sent.length).toBe(2);
      // A resposta 1 já está no cache e a 2 ainda está segurada: a tela segue a edição 2.
      await page.waitForTimeout(300);
      expect(await fav.getAttribute("aria-label")).toBe(before);

      const saved = page.waitForResponse(
        (r) => r.url().endsWith(`/api/books/${id}`) && r.ok()
      );
      releases[1]();
      await saved;
      await page.unroute(new RegExp(`/api/books/${id}$`));

      await page.reload();
      await cover.hover();
      await expect(fav).toHaveAttribute("aria-label", before);
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
    // Até 640px a Estante não mostra a contagem "N livros": confere pelos cards.
    await expect(page.locator("[data-bid]")).toHaveCount(1);
    await expect(page.getByText(/^1 de \d+ livros$/)).toBeHidden();
    await page.getByRole("button", { name: "Recolher busca" }).click();
    await expect(
      page.getByRole("textbox", { name: "Buscar no acervo" })
    ).toHaveCount(0);
    await expect(page.getByText(/Busca: kindred/)).toBeVisible();
    await expect(page).toHaveURL(/q=kindred/);
    await page.getByRole("button", { name: "Abrir busca" }).click();
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await expect(page).not.toHaveURL(/q=kindred/);
    // O x fica dentro do campo: limpar mantém o campo aberto, vazio e focado.
    const field = page.getByRole("textbox", { name: "Buscar no acervo" });
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Limpar busca" })
    ).toHaveCount(0);
    await expect(page.locator("[data-bid]").nth(1)).toBeVisible();
  });

  test("chips da Estante rolam arrastando com o mouse sem filtrar", async ({
    page,
  }) => {
    await page.goto("/estante");
    const todos = page.getByRole("button", { name: /^Todos/ });
    const strip = todos.locator("..");
    const box = (await todos.boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 300, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, y, { steps: 8 });
    await page.mouse.move(box.x + 20, y, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(() => strip.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(100);
    await expect(todos).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/estante$/);
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
      await expect(favorite).toBeVisible();
      await expect(status).toBeVisible();
      // O seletor de status ocupa a largura toda do card, sem botão ao lado.
      const cardBox = await firstCard.boundingBox();
      const box = await status.boundingBox();
      expect(Math.abs(box!.x - cardBox!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.width - cardBox!.width)).toBeLessThanOrEqual(1);
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

test.describe("devolução de empréstimo (BP-07)", () => {
  test.use({ storageState: AUTH_STATE });

  test("livro lido no ano continua na meta emprestado e depois de devolvido", async ({
    page,
  }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    // Macunaíma é "lido" em 2026 na fixture de referência.
    const goalDone = page
      .getByText(/livros lidos$/)
      .locator("xpath=preceding-sibling::span[1]");
    const inYearReads = page.getByRole("button", {
      name: "Desfazer leitura de Macunaíma",
    });

    await page.goto("/");
    await expect(inYearReads).toHaveCount(1);
    const before = await goalDone.textContent();

    await page.goto("/estante?q=macunaima");
    await chooseFirstStatus(page, "Emprestado");
    const lend = page.getByRole("dialog");
    await lend.getByLabel("Nome da pessoa").fill("Rita");
    await lend.getByRole("button", { name: "Marcar como emprestado" }).click();
    await expect(page.getByText(/Com Rita/).first()).toBeVisible();

    await page.goto("/");
    await expect(goalDone).toHaveText(before ?? "");
    await expect(inYearReads).toHaveCount(1);

    await page.goto("/estante?q=macunaima");
    await page
      .getByRole("button", {
        name: "Registrar devolução de livro emprestado a Rita",
      })
      .first()
      .click();
    await expect(page.getByText("Macunaíma devolvido (Lido)")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Status" }).first()
    ).toHaveText("Lido");
    await page.goto("/");
    await expect(goalDone).toHaveText(before ?? "");
    await expect(inYearReads).toHaveCount(1);
  });
});

test.describe("busca do header fora da Estante (BP-08)", () => {
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  });

  /** Digita sem pausa e confere que a Estante abriu com o texto inteiro. */
  async function typeFromDashboard(page: Page) {
    const search = page
      .locator("header:visible")
      .getByRole("textbox", { name: "Buscar no acervo" });
    await expect(search).toBeFocused();
    await page.keyboard.type("kindred");
    await expect(page).toHaveURL(/\/estante\?q=kindred$/);
    await expect(search).toHaveValue("kindred");
    await expect(page.locator("[data-bid]")).toHaveCount(1);
  }

  test("no desktop, digitar rápido no Painel leva à Estante com o texto inteiro", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Lendo agora")).toBeVisible();
    await page
      .locator("header:visible")
      .getByRole("textbox", { name: "Buscar no acervo" })
      .click();
    await typeFromDashboard(page);

    // A busca criou uma única entrada no histórico.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test("no celular, digitar rápido no Painel leva à Estante com o texto inteiro", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByText("Lendo agora")).toBeVisible();
    await page
      .locator("header:visible")
      .getByRole("button", { name: "Abrir busca" })
      .click();
    await typeFromDashboard(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("KPI de empréstimos pelo teclado (BP-09)", () => {
  test.use({ storageState: AUTH_STATE });

  test("Enter e Espaço abrem a lista de livros emprestados", async ({
    page,
  }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await page.goto("/");
    const kpi = page.getByRole("button", { name: /^Emprestados/ });
    const heading = page
      .getByRole("dialog")
      .getByRole("heading", { name: "Livros emprestados" });

    for (const key of ["Enter", "Space"]) {
      await kpi.focus();
      await page.keyboard.press(key);
      await expect(heading).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(heading).toBeHidden();
    }
  });
});
