import { expect, test } from "@playwright/test";

import { AUTH_STATE, chooseFirstStatus } from "../support/e2e";

test.use({ storageState: AUTH_STATE });

test.describe.configure({ mode: "serial" });

test.describe("acervo", () => {
  test.beforeEach(async ({ page }) => {
    // Sem rede externa: nada de capas automáticas nem busca online real.
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  });

  test("Painel mostra o acervo de referência", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Boa tarde, Ana" })
    ).toBeVisible();
    await expect(page.getByText("Livros no acervo")).toBeVisible();
    await expect(page.getByText("Segunda-feira, 15 de junho")).toBeVisible();
  });

  test("registrar livro, abrir a ficha e excluir em dois cliques", async ({
    page,
  }) => {
    await page.goto("/estante?ordem=recentes");
    await page.getByRole("button", { name: "+ Registrar livro" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Registrar livro" })
    ).toBeVisible();
    await dialog.getByLabel("Título *").fill("Livro de Teste E2E");
    await dialog.getByLabel("Autor(a) (opcional)").fill("Autora Teste");
    await dialog.getByLabel("Páginas").fill("123");
    await dialog.getByLabel("Data de aquisição").fill("2026-06-14");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Livro registrado no acervo")).toBeVisible();

    await page.reload();
    await page.getByText("Livro de Teste E2E", { exact: true }).nth(1).click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByText("Nº 31 do acervo")).toBeVisible();
    await expect(ficha.getByText("123", { exact: true })).toBeVisible();
    await ficha.getByRole("button", { name: "Excluir livro" }).click();
    await ficha.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Livro excluído")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Livro de Teste E2E")).toHaveCount(0);
  });

  test("busca online preenche o formulário ao escolher um livro", async ({
    page,
  }) => {
    await page.route(
      /^https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?/,
      (route) =>
        route.fulfill({
          json: {
            items: [
              {
                volumeInfo: {
                  title: "Torto arado: guia de leitura",
                  imageLinks: { thumbnail: "https://exemplo.com/capa.jpg" },
                },
              },
              {
                volumeInfo: {
                  title: "Torto arado",
                  authors: ["Itamar Vieira Junior"],
                  categories: ["Romance"],
                  publisher: "Todavia",
                  publishedDate: "2019-08-01",
                  pageCount: 264,
                },
              },
            ],
          },
        })
    );
    await page.route(/^https:\/\/openlibrary\.org\/search\.json\?/, (route) =>
      route.fulfill({ json: { docs: [] } })
    );
    await page.route(/^https:\/\/itunes\.apple\.com\/search\?/, (route) =>
      route.fulfill({ json: { results: [] } })
    );

    await page.goto("/estante");
    await page.getByRole("button", { name: "+ Registrar livro" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Buscar online").fill("Torto arado");
    await dialog.getByRole("button", { name: "Buscar", exact: true }).click();
    const matches = dialog
      .getByRole("button")
      .filter({ hasText: "Torto arado" });
    await expect(matches.first()).toContainText("Itamar Vieira Junior");
    await matches.first().click();

    await expect(dialog.getByLabel("Título *")).toHaveValue("Torto arado");
    await expect(dialog.getByLabel("Autor(a) (opcional)")).toHaveValue(
      "Itamar Vieira Junior"
    );
    await expect(dialog.getByLabel("Editora")).toHaveValue("Todavia");
    await expect(dialog.getByLabel("Gênero da obra")).toHaveValue("Romance");
    await expect(dialog.getByLabel("Ano de lançamento")).toHaveValue("2019");
    await expect(dialog.getByLabel("Páginas")).toHaveValue("264");
  });

  test("Gênero da obra sugere, filtra sem acento e aceita gênero novo", async ({
    page,
  }) => {
    await page.goto("/estante?ordem=recentes");
    await page.getByRole("button", { name: "+ Registrar livro" }).click();
    const dialog = page.getByRole("dialog");
    const genre = dialog.getByLabel("Gênero da obra");

    await genre.click();
    await page.getByRole("option", { name: "Fantasia", exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(genre).toHaveValue("Fantasia");

    await genre.fill("ficcao");
    await expect(
      page.getByRole("option", { name: "Ficção científica e distopia" })
    ).toBeVisible();
    for (const text of await page.getByRole("option").allInnerTexts()) {
      expect(text).toMatch(/ficção/i);
    }

    // Esc fecha só a lista, não o modal.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(genre).toBeFocused();

    await genre.fill("Cordel");
    await expect(
      page.getByText("Nenhuma sugestão. O gênero fica como digitado.")
    ).toBeVisible();
    await dialog.getByLabel("Título *").fill("Livro Gênero E2E");
    await dialog.getByLabel("Data de aquisição").fill("2026-06-14");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Livro registrado no acervo")).toBeVisible();

    await page.reload();
    await page.getByText("Livro Gênero E2E", { exact: true }).nth(1).click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByText("Cordel", { exact: true })).toBeVisible();
    await ficha.getByRole("button", { name: "Excluir livro" }).click();
    await ficha.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Livro excluído")).toBeVisible();
  });

  test("Gênero do autor(a) e Nacionalidade usam combobox; toast fecha", async ({
    page,
  }) => {
    await page.goto("/estante?ordem=recentes");
    await page.getByRole("button", { name: "+ Registrar livro" }).click();
    const dialog = page.getByRole("dialog");

    const gender = dialog.getByRole("combobox", { name: /Gênero do autor/ });
    await gender.click();
    await page.getByRole("option", { name: "Mulher", exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(gender).toContainText("Mulher");

    const nationality = dialog.getByLabel("Nacionalidade do autor");
    await nationality.fill("nige");
    await expect(
      page.getByRole("option", { name: "nigeriana", exact: true })
    ).toBeVisible();
    await nationality.fill("cabo-verdiana");
    await page
      .getByRole("option", { name: "Adicionar “cabo-verdiana”" })
      .click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(nationality).toHaveValue("cabo-verdiana");

    await dialog.getByLabel("Título *").fill("Livro Combobox E2E");
    await dialog.getByLabel("Data de aquisição").fill("2026-06-14");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Livro registrado no acervo")).toBeVisible();
    await page.getByRole("button", { name: "Fechar notificação" }).click();
    await expect(page.getByText("Livro registrado no acervo")).toHaveCount(0);

    await page.reload();
    await page.getByText("Livro Combobox E2E", { exact: true }).nth(1).click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByText("Mulher", { exact: true })).toBeVisible();
    await expect(
      ficha.getByText("Cabo-verdiana", { exact: true })
    ).toBeVisible();
    await ficha.getByRole("button", { name: "Excluir livro" }).click();
    await ficha.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Livro excluído")).toBeVisible();
  });

  test("restaurar arquivo inválido mostra toast de erro com nota", async ({
    page,
  }) => {
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
    // Os toasts (Sonner) ficam na região viva "Notificações".
    const toasts = page.getByRole("region", { name: /Notificações/ });
    await expect(
      toasts.getByText("Não foi possível restaurar o backup")
    ).toBeVisible();
    await expect(
      toasts.getByText(
        "O arquivo escolhido não é um backup válido da Bodega Literária."
      )
    ).toBeVisible();
  });

  test("restaurar backup sem livros válidos não pede confirmação nem apaga o acervo", async ({
    page,
  }) => {
    await page.goto("/");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: "Restaurar backup" }).click(),
    ]);
    await chooser.setFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from('[{"foo":1},{"bar":2}]'),
    });
    const toasts = page.getByRole("region", { name: /Notificações/ });
    await expect(
      toasts.getByText(
        "O arquivo escolhido não é um backup válido da Bodega Literária."
      )
    ).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByText("Livros no acervo")).toBeVisible();
  });

  test("a confirmação de restaurar conta só os livros válidos", async ({
    page,
  }) => {
    await page.goto("/");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: "Restaurar backup" }).click(),
    ]);
    await chooser.setFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from('[{"title":"A"},{"title":"B"},{"foo":1}]'),
    });
    const dialog = page.getByRole("alertdialog");
    await expect(
      dialog.getByText(/O backup tem 2 livros \(1 item ignorado\)/)
    ).toBeVisible();
    // Cancela: o acervo de referência é compartilhado pelos testes seguintes.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Salvar fica inativo sem título e números são validados", async ({
    page,
  }) => {
    await page.goto("/estante");
    await page.getByRole("button", { name: "+ Registrar livro" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Salvar" })
    ).toHaveAttribute("aria-disabled", "true");
    await dialog.getByLabel("Título *").fill("X");
    await dialog
      .getByLabel("Capa (link da imagem)")
      .fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(
      dialog.getByText("Use um link http(s) para a capa.")
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("emprestar pede o nome no estilo do app e persiste", async ({
    page,
  }) => {
    await page.goto("/estante?q=frankenstein");
    await chooseFirstStatus(page, "Emprestado");
    const lend = page.getByRole("dialog");
    await expect(
      lend.getByRole("heading", { name: "Emprestado para quem?" })
    ).toBeVisible();
    await lend.getByLabel("Nome da pessoa").fill("Joana");
    await lend.getByRole("button", { name: "Marcar como emprestado" }).click();
    await expect(page.getByText(/Com Joana/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Com Joana/)).toBeVisible();

    // No Painel: o KPI de Emprestados mostra o modal com a Joana e permite devolver
    await page.goto("/");
    await page.getByText("Emprestados").click();
    const modal = page.getByRole("dialog");
    await expect(
      modal.getByRole("heading", { name: "Livros emprestados" })
    ).toBeVisible();
    await expect(modal.getByText(/Com Joana/)).toBeVisible();
    await modal.getByRole("button", { name: "Devolver" }).first().click();
    await expect(page.getByText(/devolvido/)).toBeVisible();
  });

  test("filtros e ordenação ficam na URL", async ({ page }) => {
    await page.goto("/estante");
    await page.getByRole("button", { name: /^Lidos/ }).click();
    await expect(page).toHaveURL(/status=lido/);
    await page.getByRole("button", { name: /Ordenar/ }).click();
    await page.getByRole("button", { name: "Maiores" }).click();
    await expect(page).toHaveURL(/ordem=paginas/);
    await page.reload();
    await expect(page.getByText(/^\d+ de 30 livros$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Ordenar/ })).toContainText(
      "Páginas · maiores"
    );
  });

  test("meta anual persiste por ano", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Aumentar meta" }).click();
    await expect(page.getByText("Meta: 25")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Meta: 25")).toBeVisible();
    await page.getByRole("button", { name: "Diminuir meta" }).click();
    await expect(page.getByText("Meta: 24")).toBeVisible();
  });

  test("exportar CSV e backup", async ({ page }) => {
    await page.goto("/");
    const [csv] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exportar Excel (CSV)" }).click(),
    ]);
    expect(csv.suggestedFilename()).toMatch(/^acervo-\d{4}-\d{2}-\d{2}\.csv$/);
    const [json] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Salvar backup" }).click(),
    ]);
    expect(json.suggestedFilename()).toMatch(/\.json$/);
  });

  test("ações rápidas de status na Estante e no Painel", async ({ page }) => {
    // 1. No Painel: "Ler" nos últimos adicionados inicia a leitura
    await page.goto("/");
    const lerBtn = page
      .getByRole("button", { name: /^Começar a ler / })
      .first();
    if (await lerBtn.isVisible()) {
      await lerBtn.click();
      await expect(page.getByText(/Boa leitura:/)).toBeVisible();
    }

    // 2. Na lista da Estante: alternar status com botão de ciclo rápido
    await page.goto("/estante?vista=lista");
    const cycleBtn = page
      .getByRole("button", {
        name: /Começar a ler|Concluir leitura|Marcar como não lido/,
      })
      .first();
    await expect(cycleBtn).toBeVisible();
    await cycleBtn.click();
    await expect(
      page.getByRole("region", { name: /Notificações/ }).getByRole("listitem")
    ).toBeVisible();
  });

  test("busca mobile auto-foca input ao abrir", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/estante");
    const openSearchBtn = page.getByRole("button", { name: "Abrir busca" });
    await expect(openSearchBtn).toBeVisible();
    await openSearchBtn.click();
    const searchInput = page.getByRole("textbox", { name: "Buscar no acervo" });
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();
  });
});
