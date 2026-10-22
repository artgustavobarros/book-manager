import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

test.use({ storageState: AUTH_STATE });
test.describe.configure({ mode: "serial" });

const SLUG = "ana-lima";
const SHELF = "/estante/" + SLUG;
/** Acervo de referência: 30 livros, 2 doados. */
const PUBLIC_COUNT = 28;

/** Visitante sem sessão (contexto novo, sem cookies). */
async function visitor(
  browser: Browser
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    locale: "pt-BR",
  });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  return { ctx, page };
}

async function openShare(page: Page) {
  await page
    .getByRole("button", { name: "Compartilhar estante" })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Compartilhar" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
});

test("a estante começa privada e o dono a publica pelo cabeçalho", async ({
  page,
  browser,
}) => {
  const { ctx, page: anon } = await visitor(browser);
  expect((await anon.goto(SHELF))?.status()).toBe(404);
  await ctx.close();

  await page.goto("/");
  const dialog = await openShare(page);
  await expect(dialog.getByText("Sua estante ainda é privada.")).toBeVisible();
  await expect(dialog.getByLabel("Link da estante")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Publicar estante" }).click();
  await expect(dialog.getByLabel("Link da estante")).toHaveValue(
    new RegExp(SHELF + "$")
  );
  await expect(dialog.getByRole("link", { name: "WhatsApp" })).toBeVisible();
});

test("o visitante vê a estante sem campos privados nem doados", async ({
  browser,
}) => {
  const { ctx, page } = await visitor(browser);
  const res = await page.goto(SHELF);
  expect(res?.status()).toBe(200);
  const html = (await res?.text()) ?? "";
  for (const secret of [
    "Paula",
    "Rafael",
    "Parei na página 180",
    "Emprestado em março",
    "2023-01-19",
    "Orgulho e preconceito",
    "O grande Gatsby",
    "ana@exemplo.com",
  ]) {
    expect(html, secret).not.toContain(secret);
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Lima");
  await expect(
    page.getByText(PUBLIC_COUNT + " livros", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Criar minha estante" })
  ).toHaveAttribute("href", "/entrar?modo=cadastro");
  await expect(page.getByText("Catalogue a sua também →")).toBeVisible();
  await expect(page.getByText("Modo visitante.")).toHaveCount(0);
  // Emprestado aparece como status, sem o nome de quem pegou.
  const torto = page.getByRole("button", { name: /Torto arado/ });
  await expect(torto).toContainText("Emprestado");
  await ctx.close();
});

test("recorte da URL, busca, filtros, ficha e sorteio", async ({ browser }) => {
  const { ctx, page } = await visitor(browser);

  await page.goto(SHELF + "?status=doado&genero=xyz&livro=1");
  await expect(
    page.getByText(PUBLIC_COUNT + " livros", { exact: true })
  ).toBeVisible();

  await page.goto(SHELF + "?genero=terror-e-gotico");
  await expect(
    page.getByText(
      "Ana compartilhou os livros de Terror e gótico. Mude os filtros à vontade para ver o resto."
    )
  ).toBeVisible();
  await expect(
    page.getByText("2 de " + PUBLIC_COUNT + " livros")
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver estante completa" }).click();
  await expect(
    page.getByText(PUBLIC_COUNT + " livros", { exact: true })
  ).toBeVisible();

  await page.getByLabel("Buscar título ou autor").fill("sertao");
  await expect(
    page.getByRole("list", { name: "Livros" }).getByRole("button")
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Limpar filtros" }).click();

  // Outros specs mudam status do acervo de referência: a contagem vem da própria página.
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Lidos", exact: true })
    .click();
  const count = page.getByText(
    new RegExp("^\\d+ de " + PUBLIC_COUNT + " livros$")
  );
  await expect(count).toBeVisible();
  const lidos = Number((await count.innerText()).split(" ")[0]);
  expect(lidos).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Copiar link", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Link copiado ✓" })
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    new RegExp(SHELF + "\\?status=lido$")
  );

  await page.getByRole("button", { name: "Sortear para mim" }).click();
  const draw = page.getByRole("dialog", { name: "Sorteio para você" });
  await expect(
    draw.getByText("Sorteado entre " + lidos + " livros desta seleção")
  ).toBeVisible();
  await draw.getByRole("button", { name: "Ver ficha" }).click();
  const ficha = page
    .getByRole("dialog")
    .filter({ hasText: "Da estante de Ana" });
  await expect(ficha).toBeVisible();
  await expect(ficha.getByRole("button", { name: "Editar ficha" })).toHaveCount(
    0
  );
  await expect(ficha.getByRole("combobox")).toHaveCount(0);
  await ficha.getByRole("button", { name: "Copiar link do livro" }).click();
  const bookLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(bookLink).toMatch(new RegExp(SHELF + "\\?livro=[0-9a-f-]{36}$"));
  await page.keyboard.press("Escape");
  await expect(ficha).toHaveCount(0);

  // Fechar o sorteio não esquece o último livro: o próximo sorteio traz outro.
  const drawnTitle = draw
    .getByRole("heading")
    .filter({ hasNotText: "Sorteio para você" });
  await page.getByRole("button", { name: "Sortear para mim" }).click();
  const firstTitle = (await drawnTitle.textContent()) ?? "";
  await page.keyboard.press("Escape");
  await expect(draw).toHaveCount(0);
  await page.getByRole("button", { name: "Sortear para mim" }).click();
  await expect(drawnTitle).not.toHaveText(firstTitle);
  await page.keyboard.press("Escape");

  // O link do livro abre a ficha sobre a estante, com o aviso de livro compartilhado.
  await page.goto(bookLink);
  await expect(
    page.getByText(/^Ana compartilhou “.+” com você\./)
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").filter({ hasText: "Da estante de Ana" })
  ).toBeVisible();
  await ctx.close();
});

test("metadados Open Graph no HTML do servidor e imagem OG", async ({
  request,
}) => {
  const res = await request.get(SHELF + "?status=lido", {
    headers: { cookie: "" },
  });
  expect(res.status()).toBe(200);
  const html = await res.text();
  const meta = (attr: string, key: string) =>
    html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
  expect(meta("property", "og:title")).toBe(
    "Livros lidos na estante de Ana Lima"
  );
  expect(meta("property", "og:url")).toMatch(
    new RegExp(SHELF + "\\?status=lido$")
  );
  expect(meta("name", "twitter:card")).toBe("summary_large_image");
  expect(meta("name", "robots")).toBe("noindex, nofollow");
  expect(html).toContain(
    "<title>Livros lidos na estante de Ana Lima · Bodega Literária</title>"
  );
  const image = meta("property", "og:image") ?? "";
  expect(image).toMatch(
    /^https?:\/\/.+\/og\/estante\/ana-lima\?status=lido&amp;v=|^https?:\/\/.+\/og\/estante\/ana-lima\?status=lido&v=/
  );
  const png = await request.get(image.replaceAll("&amp;", "&"), {
    maxRedirects: 0,
  });
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toBe("image/png");
});

test("o dono vê o modo visitante e compartilha da Estante e da ficha", async ({
  page,
}) => {
  await page.goto(SHELF);
  await expect(page.getByText("Modo visitante.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Criar minha estante" })
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao acervo" }).click();
  await expect(page).toHaveURL("/estante");

  await page.goto("/estante?status=lendo");
  await page.getByRole("button", { name: "Compartilhar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Compartilhar" });
  await expect(
    dialog.getByRole("button", { name: "Um status" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: /^Lendo/ })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(dialog.getByLabel("Link da estante")).toHaveValue(
    new RegExp(SHELF + "\\?status=lendo$")
  );
  const x = await dialog.getByRole("link", { name: "X" }).getAttribute("href");
  expect(x).toContain(
    "https://x.com/intent/post?text=Lendo%20agora%20na%20estante%20de%20Ana%20Lima&url="
  );
  await dialog.getByRole("link", { name: "Ver como visitante →" }).click();
  await expect(page).toHaveURL(SHELF + "?status=lendo");
  await expect(page.getByText("Modo visitante.")).toBeVisible();

  await page.goto("/estante?q=kindred");
  await page.getByRole("button", { name: "Kindred" }).first().click();
  await page
    .getByRole("button", { name: "Compartilhar", exact: true })
    .last()
    .click();
  const share = page.getByRole("dialog", { name: "Compartilhar" });
  await expect(share.getByRole("button", { name: "Um livro" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(share.getByRole("option", { selected: true })).toContainText(
    "Kindred"
  );
  await expect(
    share.getByText(/^Kindred, de Octavia E\. Butler · na estante de Ana$/)
  ).toBeVisible();
});

test("tornar privada derruba o link", async ({ page, browser }) => {
  await page.goto("/");
  const dialog = await openShare(page);
  await dialog.getByRole("button", { name: "Tornar privada" }).click();
  await expect(
    dialog.getByRole("button", { name: "Publicar estante" })
  ).toBeVisible();

  const { ctx, page: anon } = await visitor(browser);
  expect((await anon.goto(SHELF))?.status()).toBe(404);
  expect((await anon.request.get("/og" + SHELF)).status()).toBe(404);
  await ctx.close();
});
