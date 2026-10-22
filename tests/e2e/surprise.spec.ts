import { expect, type Page, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

test.use({ storageState: AUTH_STATE });

test.describe.configure({ mode: "serial" });

async function openSurprise(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Me surpreenda" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Me surpreenda" });
  await expect(dialog).toBeVisible();
  return { dialog, field: dialog.getByLabel("Sortear entre") };
}

test.describe("Me surpreenda: filtro por gênero", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  });

  test("escolher um gênero na lista sorteia dentro dele", async ({ page }) => {
    const { dialog, field } = await openSurprise(page);
    await expect(field).toHaveValue(/^Todos os gêneros \(\d+\)$/);

    await field.click();
    const romance = page.getByRole("option", { name: /^Romance \(\d+\)$/ });
    await expect(romance).toBeVisible();
    await romance.click();

    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(field).toHaveValue(/^Romance \(\d+\)$/);
    const title = await dialog.getByRole("heading", { level: 2 }).innerText();
    const booksResponse = await page.request.get("/api/books");
    expect(booksResponse.ok()).toBe(true);
    const { books } = (await booksResponse.json()) as {
      books: { title: string; genre: string | null; status: string }[];
    };
    expect(
      books.some(
        (book) =>
          book.title === title &&
          book.genre === "Romance" &&
          book.status === "nao-lido"
      )
    ).toBe(true);
  });

  test("digitar filtra sem diferenciar acentos e mostra o vazio", async ({
    page,
  }) => {
    const { field } = await openSurprise(page);
    await field.fill("gotico");
    await expect(page.getByRole("option")).toHaveText([
      /^Terror e gótico \(\d+\)$/,
    ]);

    await field.fill("zzz");
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(page.getByText("Nenhum gênero encontrado.")).toBeVisible();
  });

  test("Esc fecha só a lista e sair sem escolher mantém a seleção", async ({
    page,
  }) => {
    const { dialog, field } = await openSurprise(page);
    await field.click();
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(field).toBeFocused();

    await field.fill("got");
    // Com a lista aberta, o Base UI esconde o resto do painel da árvore de acessibilidade.
    await dialog.locator("h2").filter({ visible: true }).click();
    await expect(field).toHaveValue(/^Todos os gêneros \(\d+\)$/);
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("teclado: setas e Enter escolhem a opção", async ({ page }) => {
    const { field } = await openSurprise(page);
    await field.focus();
    await field.fill("terror");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(field).toHaveValue(/^Terror e gótico \(\d+\)$/);
  });
});
