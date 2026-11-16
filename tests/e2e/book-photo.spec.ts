import { expect, type Page, test } from "@playwright/test";

import { PHOTO_DATA_URL } from "../fixtures/book-photo";
import { AUTH_STATE } from "../support/e2e";

const MODEL = "nvidia/nemotron-3.5-super-vl:free";
const READING = {
  title: "Torto arado",
  author: "Itamar Vieira Junior",
  isbn: null,
};
const PHOTO_HELP =
  "Um livro por foto, com título e autor legíveis na capa ou lombada. JPEG, PNG ou WebP, até 20 MB. A foto será reduzida antes do envio.";

test.use({ storageState: AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.goto("/estante");
  await page.getByRole("button", { name: /^\+? ?Registrar livro$/ }).click();
});

async function openPhoto(page: Page) {
  await page
    .getByRole("button", { name: "Identificar por foto", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Identificar por foto",
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

test("câmera abre modal com ações, sem seleção de modelo nem identificação manual", async ({
  page,
}) => {
  const dialog = await openPhoto(page);
  await expect(
    dialog.getByRole("heading", { name: "Identificar por foto" })
  ).toBeVisible();
  await expect(
    dialog.locator("p").filter({ hasText: PHOTO_HELP })
  ).toBeVisible();
  await expect(dialog.getByText(/será enviada automaticamente/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Tirar foto", exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Escolher imagem", exact: true })
  ).toBeVisible();
  await expect(dialog.getByRole("combobox")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Voltar ao cadastro" })
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Identificar livro", exact: true })
  ).toHaveCount(0);
});

test("envia uma vez ao Nemotron, mostra progresso e volta ao cadastro sem salvar nem escolher edição", async ({
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
  await page.route(
    /^https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?/,
    (route) => {
      const query = new URL(route.request().url()).searchParams.get("q") ?? "";
      // As capas da estante consultam o catálogo em segundo plano.
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
                publisher: "Todavia",
                pageCount: 264,
              },
            },
          ],
        },
      });
    }
  );
  await page.route(/^https:\/\/openlibrary\.org\/search\.json\?/, (route) =>
    route.fulfill({ json: { docs: [] } })
  );
  await page.route(/^https:\/\/itunes\.apple\.com\/search\?/, (route) =>
    route.fulfill({ json: { results: [] } })
  );
  const photo = await openPhoto(page);
  await choosePhoto(page);
  await expect(
    photo.getByRole("progressbar", { name: "Identificando livro" })
  ).toBeVisible();
  await expect(photo.getByRole("progressbar")).not.toHaveAttribute("value");
  await expect(
    photo.getByRole("button", { name: "Escolher imagem", exact: true })
  ).toBeDisabled();
  await expect.poll(() => models.length).toBe(1);
  release();
  await expect(photo).toHaveCount(0);
  const form = page.getByRole("dialog", {
    name: "Registrar livro",
    exact: true,
  });
  await expect(form.getByLabel("Título *")).toHaveValue(READING.title);
  await expect(form.getByLabel("Título *")).toBeFocused();
  await expect(form.getByLabel("Autor(a) (opcional)")).toHaveValue(
    READING.author
  );
  await expect(form.getByLabel("Editora", { exact: true })).toHaveValue("");
  const result = form.getByRole("button").filter({ hasText: "Torto arado" });
  await expect(result).toBeVisible();
  expect(models).toEqual([MODEL]);
  expect(queries).toEqual(["Torto arado Itamar Vieira Junior"]);
  expect(creates).toBe(0);
  await result.click();
  await expect(form.getByLabel("Editora", { exact: true })).toHaveValue(
    "Todavia"
  );
  await expect(form.getByLabel("Páginas", { exact: true })).toHaveValue("264");
});

test("captura também inicia leitura e preserva texto mesmo quando o catálogo falha", async ({
  page,
}) => {
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({
      json: { reading: READING, model: MODEL, elapsedMs: 500 },
    })
  );
  const photo = await openPhoto(page);
  await expect(page.getByLabel("Fotografar capa ou lombada")).toHaveAttribute(
    "capture",
    "environment"
  );
  await choosePhoto(page, true);
  await expect(photo).toHaveCount(0);
  await expect(page.getByLabel("Título *")).toHaveValue(READING.title);
  await expect(page.getByLabel("Autor(a) (opcional)")).toHaveValue(
    READING.author
  );
  await expect(
    page.getByText(
      "Não foi possível consultar os catálogos. Verifique a conexão."
    )
  ).toBeVisible();
});

test("falha e foto ilegível permitem repetir sem perder cadastro manual", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Título digitado");
  const photo = await openPhoto(page);
  await page.route("**/api/books/recognize", (route) =>
    route.fulfill({ status: 429, json: { error: "Limite de fotos atingido." } })
  );
  await choosePhoto(page);
  await expect(photo.getByText("Limite de fotos atingido.")).toBeVisible();
  await expect(photo.getByRole("progressbar")).toHaveCount(0);
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
    photo.getByText(/Não consegui ler título ou ISBN/)
  ).toBeVisible();
  await photo
    .getByRole("button", { name: "Fechar identificação por foto" })
    .click();
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
  const photo = await openPhoto(page);
  const request = page.waitForRequest("**/api/books/recognize");
  await choosePhoto(page);
  await request;
  await photo
    .getByRole("button", { name: "Fechar identificação por foto" })
    .click();
  release();
  await expect(page.getByLabel("Título *")).toHaveValue("Título digitado");
  await expect(page.getByLabel("Buscar online")).toBeEnabled();
  await openPhoto(page);
  await expect(photo.getByRole("progressbar")).toHaveCount(0);
  await expect(
    photo.getByRole("button", { name: "Escolher imagem", exact: true })
  ).toBeEnabled();
  await choosePhoto(page);
  await expect(photo).toHaveCount(0);
  await expect(page.getByLabel("Título *")).toHaveValue(READING.title);
});

test.describe("captura nativa em dispositivo de toque", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("ícone chama câmera sem modal de escolha; cancelar não altera o cadastro", async ({
    page,
  }) => {
    await page.getByLabel("Título *").fill("Rascunho no celular");
    const form = page.getByRole("dialog", {
      name: "Registrar livro",
      exact: true,
    });
    await expect(
      form.getByRole("button", { name: "Escolher imagem", exact: true })
    ).toBeVisible();
    await expect(form.getByText(/Ao escolher ou tirar uma foto/)).toBeVisible();
    const camera = form.getByRole("button", {
      name: "Identificar por foto",
      exact: true,
    });
    await expect
      .poll(async () => (await camera.boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(async () => (await camera.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);
    const chooserPromise = page.waitForEvent("filechooser");
    await camera.click();
    const chooser = await chooserPromise;
    expect(await chooser.element().getAttribute("capture")).toBe("environment");
    await expect(
      page.getByRole("dialog", { name: "Identificar por foto", exact: true })
    ).toHaveCount(0);
    await chooser.setFiles([]);
    await expect(page.getByLabel("Título *")).toHaveValue(
      "Rascunho no celular"
    );
    const dimensions = await form.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  });

  test("galeria fica no cadastro e inicia identificação automática ao selecionar imagem", async ({
    page,
  }) => {
    await page.route("**/api/books/recognize", (route) =>
      route.fulfill({
        json: { reading: READING, model: MODEL, elapsedMs: 500 },
      })
    );
    const chooserPromise = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Escolher imagem", exact: true })
      .click();
    const chooser = await chooserPromise;
    expect(await chooser.element().getAttribute("capture")).toBeNull();
    await expect(
      page.getByRole("dialog", { name: "Identificar por foto", exact: true })
    ).toHaveCount(0);
    await chooser.setFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: Buffer.from(PHOTO_DATA_URL.split(",")[1], "base64"),
    });
    await expect(page.getByLabel("Título *")).toHaveValue(READING.title);
    await expect(page.getByLabel("Autor(a) (opcional)")).toHaveValue(
      READING.author
    );
    await expect(
      page.getByRole("dialog", { name: "Identificar por foto", exact: true })
    ).toHaveCount(0);
  });
});

test("Escape fecha apenas foto, mantém rascunho e devolve foco à câmera", async ({
  page,
}) => {
  await page.getByLabel("Título *").fill("Rascunho");
  const photo = await openPhoto(page);
  await page.keyboard.press("Escape");
  await expect(photo).toHaveCount(0);
  await expect(page.getByLabel("Título *")).toHaveValue("Rascunho");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Identificar por foto", exact: true })
  ).toBeFocused();
});

test("imagem inválida não envia ao provedor e layout cabe no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const photo = await openPhoto(page);
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
  await expect(photo.getByRole("status")).toContainText("JPEG, PNG ou WebP");
  expect(requests).toBe(0);
  await choosePhoto(page);
  await expect(photo.getByText("Limite de fotos atingido.")).toBeVisible();
  await expect(
    photo.getByRole("img", { name: "Foto escolhida para identificar o livro" })
  ).toBeVisible();
  await expect(
    photo.getByRole("button", { name: "Tirar foto", exact: true })
  ).toBeVisible();
  for (const dialog of [
    photo,
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
