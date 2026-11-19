import { expect, type Page, test } from "@playwright/test";

import { PHOTO_DATA_URL } from "../fixtures/book-photo";
import { AUTH_STATE } from "../support/e2e";

const MODEL = "nvidia/nemotron-3.5-super-vl:free";
const READING = {
  title: "Torto arado",
  author: "Itamar Vieira Junior",
  isbn: null,
};

test.use({ storageState: AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.goto("/estante");
  await page.getByRole("button", { name: /^\+? ?Registrar livro$/ }).click();
});

async function openScanner(page: Page) {
  await page
    .getByRole("button", { name: "Escanear livro", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Escanear livro",
    exact: true,
  });
}

async function choosePhoto(page: Page, camera = false) {
  await page
    .getByLabel(
      camera ? "Fotografar capa ou lombada" : "Imagem da capa ou lombada",
      { exact: true }
    )
    .setInputFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: Buffer.from(PHOTO_DATA_URL.split(",")[1], "base64"),
    });
}

function mockCatalogSuccess(page: Page, queries: string[] = []) {
  return Promise.all([
    page.route(
      /^https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?/,
      (route) => {
        const query =
          new URL(route.request().url()).searchParams.get("q") ?? "";
        if (query.startsWith("intitle:")) {
          return route.abort();
        }
        queries.push(query);
        return route.fulfill({
          json: {
            items: [
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
              {
                volumeInfo: {
                  title: "Torto arado — edição especial",
                  authors: ["Itamar Vieira Junior"],
                  publisher: "Todavia",
                  pageCount: 280,
                },
              },
            ],
          },
        });
      }
    ),
    page.route(/^https:\/\/openlibrary\.org\/search\.json\?/, (route) =>
      route.fulfill({ json: { docs: [] } })
    ),
    page.route(/^https:\/\/itunes\.apple\.com\/search\?/, (route) =>
      route.fulfill({ json: { results: [] } })
    ),
  ]);
}

async function installFakeCamera(page: Page) {
  await page.addInitScript(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbf8f2";
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "#1f1b18";
    for (let y = 20; y < 220; y += 24) {
      ctx.fillRect(24, y, 272, 10);
    }
    const stream = canvas.captureStream(10);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => stream,
      },
    });
  });
}

test("ao reconhecer abre modal de confirmação e preencher retorna com os dados escolhidos", async ({
  page,
}) => {
  const models: string[] = [];
  const queries: string[] = [];
  let creates = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/books"
    ) {
      creates++;
    }
  });
  let release = () => {};
  const responseReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/books/recognize", async (route) => {
    const body = route.request().postDataJSON();
    models.push(body.model);
    expect(body.image).toMatch(/^data:image\/jpeg;base64,/);
    await responseReady;
    await route.fulfill({
      json: { reading: READING, model: body.model, elapsedMs: 1234 },
    });
  });
  await mockCatalogSuccess(page, queries);

  const scanner = await openScanner(page);
  await choosePhoto(page);
  await expect(
    scanner.getByRole("progressbar", { name: "Identificando livro" })
  ).toBeVisible();
  await expect(scanner.getByRole("progressbar")).not.toHaveAttribute("value");
  await expect(
    scanner.getByRole("button", { name: "Escolher imagem", exact: true })
  ).toBeDisabled();
  await expect.poll(() => models.length).toBe(1);
  release();

  const confirm = page.getByRole("dialog", {
    name: "É algum destes livros?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await expect(
    confirm.getByRole("heading", { name: "É algum destes livros?" })
  ).toBeVisible();
  await expect(
    confirm.getByText("Torto arado · Itamar Vieira Junior")
  ).toBeVisible();
  const option = confirm
    .getByRole("button")
    .filter({ hasText: "264 p." })
    .first();
  await expect(option).toBeVisible();

  await option.click();
  await expect(confirm).toHaveCount(0);

  const form = page.getByRole("dialog", {
    name: "Registrar livro",
    exact: true,
  });
  await expect(form.getByLabel("Título *")).toHaveValue("Torto arado");
  await expect(form.getByLabel("Título *")).toBeFocused();
  await expect(form.getByLabel("Autor(a) (opcional)")).toHaveValue(
    "Itamar Vieira Junior"
  );
  await expect(form.getByLabel("Editora", { exact: true })).toHaveValue(
    "Todavia"
  );
  await expect(form.getByLabel("Páginas", { exact: true })).toHaveValue("264");
  expect(models).toEqual([MODEL]);
  expect(queries).toEqual(["Torto arado Itamar Vieira Junior"]);
  expect(creates).toBe(0);
});

test("câmera ao vivo faz auto-scan sem precisar tirar foto e abre confirmação", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installFakeCamera(page);
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({
      json: { reading: READING, model: MODEL, elapsedMs: 320 },
    })
  );
  await mockCatalogSuccess(page);

  await page.goto("/estante");
  await page.getByRole("button", { name: /^\+? ?Registrar livro$/ }).click();
  const scanner = await openScanner(page);
  await expect(
    scanner.getByRole("button", { name: "Escanear agora", exact: true })
  ).toBeVisible();

  const confirm = page.getByRole("dialog", {
    name: "É algum destes livros?",
    exact: true,
  });
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  await expect(
    confirm.getByRole("button").filter({ hasText: "Torto arado" }).first()
  ).toBeVisible();
});

test("código de barras ISBN detectado pula IA e busca livro diretamente", async ({
  page,
}) => {
  let aiCalls = 0;
  const queries: string[] = [];
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).BarcodeDetector = class {
      static async getSupportedFormats() {
        return ["ean_13"];
      }
      async detect() {
        return [{ rawValue: "9788582850350" }];
      }
    };
  });
  await installFakeCamera(page);
  await page.route("**/api/books/recognize", (route) => {
    aiCalls++;
    return route.abort();
  });
  await mockCatalogSuccess(page, queries);

  await page.goto("/estante");
  await page.getByRole("button", { name: /^\+? ?Registrar livro$/ }).click();
  await openScanner(page);

  const confirm = page.getByRole("dialog", {
    name: "É algum destes livros?",
    exact: true,
  });
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  await expect(confirm.getByText("ISBN 9788582850350")).toBeVisible();
  expect(aiCalls).toBe(0);
  expect(queries).toEqual(["isbn:9788582850350"]);
});

test("no modal de confirmação é possível tentar novamente ou preencher manualmente preservando rascunho", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Meu rascunho manual");
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({
      json: { reading: READING, model: MODEL, elapsedMs: 300 },
    })
  );
  await mockCatalogSuccess(page);

  await openScanner(page);
  await choosePhoto(page);

  const confirm = page.getByRole("dialog", {
    name: "É algum destes livros?",
    exact: true,
  });
  await expect(confirm).toBeVisible();

  await confirm
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Escanear livro", exact: true })
  ).toBeVisible();

  await choosePhoto(page);
  await expect(confirm).toBeVisible();

  await confirm
    .getByRole("button", { name: "Preencher manualmente", exact: true })
    .click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByLabel("Título *")).toHaveValue("Meu rascunho manual");
  await expect(page.getByLabel("Título *")).toBeFocused();
});

test("sem resultados nos catálogos permite usar leitura manualmente ou tentar novamente", async ({
  page,
}) => {
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({
      json: { reading: READING, model: MODEL, elapsedMs: 500 },
    })
  );
  await openScanner(page);
  await choosePhoto(page);

  const confirm = page.getByRole("dialog", {
    name: "Nenhum livro encontrado",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await expect(
    confirm.getByText(/Não foi possível consultar os catálogos online/)
  ).toBeVisible();
  await confirm.getByRole("button", { name: /Usar leitura/ }).click();
  await expect(page.getByLabel("Título *")).toHaveValue(READING.title);
  await expect(page.getByLabel("Autor(a) (opcional)")).toHaveValue(
    READING.author
  );
});

test("falha e imagem ilegível permitem repetir sem perder cadastro manual", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Título digitado");
  const scanner = await openScanner(page);
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({ status: 429, json: { error: "Limite de fotos atingido." } })
  );
  await choosePhoto(page);
  await expect(scanner.getByText("Limite de fotos atingido.")).toBeVisible();
  await expect(scanner.getByRole("progressbar")).toHaveCount(0);

  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({
      json: {
        reading: { title: null, author: null, isbn: null },
        model: MODEL,
        elapsedMs: 300,
      },
    })
  );
  await choosePhoto(page);
  await expect(
    scanner.getByText(/Não consegui ler título ou ISBN/)
  ).toBeVisible();
  await scanner.getByRole("button", { name: "Fechar scanner" }).click();
  await expect(page.getByLabel("Título *")).toHaveValue("Título digitado");
});

test("cancelar impede preenchimento tardio e reabrir permite nova tentativa", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Título digitado");
  let release = () => {};
  const responseReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/books/recognize", async (route) => {
    await responseReady;
    await route.fulfill({
      json: { reading: READING, model: MODEL, elapsedMs: 500 },
    });
  });
  await mockCatalogSuccess(page);

  const scanner = await openScanner(page);
  const request = page.waitForRequest("**/api/books/recognize");
  await choosePhoto(page);
  await request;
  await scanner.getByRole("button", { name: "Fechar scanner" }).click();
  release();

  await expect(page.getByLabel("Título *")).toHaveValue("Título digitado");
  await expect(page.getByLabel("Buscar online")).toBeEnabled();
  await openScanner(page);
  await expect(scanner.getByRole("progressbar")).toHaveCount(0);
  await expect(
    scanner.getByRole("button", { name: "Escolher imagem", exact: true })
  ).toBeEnabled();
  await choosePhoto(page);

  const confirm = page.getByRole("dialog", {
    name: "É algum destes livros?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await confirm
    .getByRole("button")
    .filter({ hasText: "264 p." })
    .first()
    .click();
  await expect(page.getByLabel("Título *")).toHaveValue(READING.title);
});

test.describe("layout mobile sem poluição visual e câmera fallback", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("botão de escanear fica limpo no formulário mobile e abre scanner ao tocar", async ({
    page,
  }) => {
    const form = page.getByRole("dialog", {
      name: "Registrar livro",
      exact: true,
    });
    const scanBtn = form.getByRole("button", {
      name: "Escanear livro",
      exact: true,
    });
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toContainText("Escanear capa, lombada ou código");
    await expect(form.getByText(/Ao escolher ou tirar uma foto/)).toHaveCount(
      0
    );
    await expect
      .poll(async () => (await scanBtn.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);

    const dimensions = await form.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);

    await scanBtn.click();
    const scanner = page.getByRole("dialog", {
      name: "Escanear livro",
      exact: true,
    });
    await expect(scanner).toBeVisible();
    const scannerDimensions = await scanner.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(scannerDimensions.scrollWidth).toBeLessThanOrEqual(
      scannerDimensions.width
    );
  });
});

test("Escape fecha apenas scanner, mantém rascunho e devolve foco ao botão", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Rascunho");
  const scanner = await openScanner(page);
  await page.keyboard.press("Escape");
  await expect(scanner).toHaveCount(0);
  await expect(page.getByLabel("Título *")).toHaveValue("Rascunho");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Escanear livro", exact: true })
  ).toBeFocused();
});

test("imagem inválida não envia ao provedor e layout cabe no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const scanner = await openScanner(page);
  let requests = 0;
  await page.route("**/api/books/recognize", (route) => {
    requests++;
    return route.fulfill({
      status: 429,
      json: { error: "Limite de fotos atingido." },
    });
  });
  await page
    .getByLabel("Imagem da capa ou lombada", { exact: true })
    .setInputFiles({
      name: "arquivo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("não é uma imagem"),
    });
  await expect(scanner.getByRole("status")).toContainText("JPEG, PNG ou WebP");
  expect(requests).toBe(0);
  await choosePhoto(page);
  await expect(scanner.getByText("Limite de fotos atingido.")).toBeVisible();
  await expect(
    scanner.getByRole("button", { name: "Tirar foto", exact: true })
  ).toBeVisible();
  for (const dialog of [
    scanner,
    page.getByRole("dialog", {
      name: "Registrar livro",
      exact: true,
      includeHidden: true,
    }),
  ]) {
    const dimensions = await dialog.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  }
});
