import { expect, test } from "@playwright/test";

import { AUTH_STATE, signIn } from "../support/e2e";

test.use({ storageState: AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
});

test("celular e tablet compartilham cabeçalho, ícones e ações", async ({
  page,
}) => {
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/estante");
    const header = page.locator("header:visible");
    await expect(header).toHaveCount(1);
    for (const label of ["Painel", "Estante", "Dados"]) {
      await expect(header.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(
      header.getByRole("button", { name: "Abrir busca" })
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: /Modo (escuro|claro)/ })
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Minha conta" })
    ).toBeVisible();
    const actions = page.locator('[data-slot="mobile-fabs"]');
    await expect(
      actions.getByRole("button", { name: "Registrar livro" })
    ).toBeVisible();
    await expect(
      actions.getByRole("button", { name: "Me surpreenda" })
    ).toBeVisible();
  }

  await page.setViewportSize({ width: 1025, height: 844 });
  await expect(page.locator("header:visible")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Abrir busca" })).toBeHidden();
  await expect(
    page.locator("header:visible").getByRole("textbox", {
      name: "Buscar no acervo",
    })
  ).toBeVisible();
  await expect(page.locator('[data-slot="mobile-fabs"]')).toBeHidden();
});

test("busca e controles flutuantes funcionam no tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto("/estante");
  const header = page.locator("header:visible");
  await header.getByRole("button", { name: "Abrir busca" }).click();
  const search = header.getByRole("textbox", { name: "Buscar no acervo" });
  await expect(search).toBeFocused();
  await search.fill("kindred");
  await header.getByRole("button", { name: "Recolher busca" }).click();
  await expect(header.getByText(/Busca: kindred/)).toBeVisible();
  await header.getByRole("button", { name: "Abrir busca" }).click();
  await expect(search).toHaveValue("kindred");

  const actions = page.locator('[data-slot="mobile-fabs"]');
  await actions.getByRole("button", { name: "Registrar livro" }).click();
  await expect(
    page.getByRole("dialog", { name: "Registrar livro" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await actions.getByRole("button", { name: "Me surpreenda" }).click();
  await expect(
    page.getByRole("dialog", { name: "Me surpreenda" })
  ).toBeVisible();
});

test("tablet sem livro elegível mantém sorteio desabilitado e rodapé acessível", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.context().clearCookies();
  await signIn(page, "zero.novato@exemplo.com", "senha-forte-123");
  await expect(page).toHaveURL("/");
  await page.goto("/estante");
  const actions = page.locator('[data-slot="mobile-fabs"]');
  await expect(
    actions.getByRole("button", { name: "Me surpreenda (indisponível)" })
  ).toBeDisabled();
  await expect(
    actions.getByRole("button", { name: "Registrar livro" })
  ).toBeEnabled();
  const roomAfterFooter = await page.locator("footer").evaluate((footer) => {
    const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
    return document.documentElement.scrollHeight - footerBottom;
  });
  expect(roomAfterFooter).toBeGreaterThanOrEqual(96);
});
