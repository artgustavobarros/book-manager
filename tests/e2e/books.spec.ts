import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

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
    await dialog.getByLabel("Autor(a) *").fill("Autora Teste");
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
    await page
      .getByRole("combobox", { name: "Status" })
      .first()
      .selectOption("emprestado");
    const lend = page.getByRole("dialog");
    await expect(
      lend.getByRole("heading", { name: "Emprestado para quem?" })
    ).toBeVisible();
    await lend.getByLabel("Nome da pessoa").fill("Joana");
    await lend.getByRole("button", { name: "Marcar como emprestado" }).click();
    await expect(page.getByText("Com Joana")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Com Joana")).toBeVisible();

    // Voltar para "Não lido" limpa o "emprestado para".
    await page
      .getByRole("combobox", { name: "Status" })
      .first()
      .selectOption("nao-lido");
    await expect(page.getByText("Com Joana")).toHaveCount(0);
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
});
