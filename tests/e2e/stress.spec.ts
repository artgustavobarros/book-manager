import { expect, test } from "@playwright/test";

import { signIn } from "../support/e2e";

test.describe("teste de estresse e carga · Persona Arthur Whale (600 livros)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "arthur.whale@exemplo.com", "senha-forte-123");
    await expect(page).toHaveURL("/");
  });

  test("carrega o painel e exibe estatísticas para conta de grande volume", async ({
    page,
  }) => {
    await expect(page.getByText("Arthur")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Resumo do acervo" }).getByText("600", {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.getByText("Emprestados")).toBeVisible();
  });

  test("navegação, busca e filtros fluidos na Estante com 600 livros", async ({
    page,
  }) => {
    const t0 = Date.now();
    await page.goto("/estante");
    await expect(
      page.getByRole("heading", { level: 1, name: "Estante" })
    ).toBeVisible();
    await expect(page.getByText("600 livros", { exact: true })).toBeVisible();
    const shelfLoadMs = Date.now() - t0;
    // O carregamento inicial da estante com 600 livros deve ocorrer em tempo hábil
    expect(shelfLoadMs).toBeLessThan(5000);

    // 1. Alterna filtro para "Lidos"
    const tFilter = Date.now();
    await page.getByRole("button", { name: /^Lidos/ }).click();
    await expect(page.getByText(/de 600 livros/)).toBeVisible();
    expect(Date.now() - tFilter).toBeLessThan(2000);

    // 2. Busca textual na coleção com 600 itens
    const tSearch = Date.now();
    const searchInput = page
      .getByRole("textbox", { name: "Buscar no acervo" })
      .first();
    await searchInput.fill("Machado");
    await expect(
      page
        .getByRole("button", { name: /Volume \d+: Odisseia Literária Machado/ })
        .first()
    ).toBeVisible();
    expect(Date.now() - tSearch).toBeLessThan(2000);

    // 3. Alterna visualização para Lista
    const tList = Date.now();
    await page.getByRole("button", { name: "Lista", exact: true }).click();
    await expect(
      page.getByRole("region", { name: /Lista de livros/i })
    ).toBeVisible();
    expect(Date.now() - tList).toBeLessThan(2000);

    // 4. Paginação: avança para a próxima página
    await page.getByRole("button", { name: "Próxima página" }).click();
    await expect(page).toHaveURL(/pagina=2/);
  });
});
