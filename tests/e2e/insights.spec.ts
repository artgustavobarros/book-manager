import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";
import { makeBook } from "../support/reference";

test.use({ storageState: AUTH_STATE });

test("/dados · filtra o gráfico de aquisições por leitura", async ({
  page,
}) => {
  await page.goto("/dados");

  const chart = page
    .getByRole("region", { name: "Gráficos do acervo" })
    .getByRole("region", { name: "Livros por ano" });
  await expect(chart.getByRole("tab", { name: "Lidos" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(
    page.getByRole("region", { name: "Livros adquiridos por ano" })
  ).toHaveCount(0);
  await expect(chart.locator("details")).toHaveCount(0);
  await chart.getByRole("tab", { name: "Adquiridos" }).click();
  await expect(chart.getByText("2026 ainda está em andamento.")).toHaveCount(0);
  await expect(chart.getByRole("link", { name: /Ver livros sem/ })).toHaveCount(
    0
  );
  const year = chart.getByRole("listitem").filter({ hasText: "2026" });
  await expect(year).toContainText("3 livros");

  await page.getByRole("button", { name: "Apenas lidos" }).click();
  await expect(year).toContainText("2 livros");

  await page.getByRole("button", { name: "Todo o acervo" }).click();
  await expect(year).toContainText("3 livros");
});

test("/dados · abre a Estante com a pendência da aba selecionada", async ({
  page,
}) => {
  await page.route("**/api/books", (route) =>
    route.fulfill({
      json: {
        books: [
          makeBook({
            title: "Livro sem ano registrado",
            reading: "lido",
            acquiredOn: "2025-02-10",
          }),
          makeBook({
            title: "Livro sem data registrada",
            reading: "lido",
            yearRead: 2025,
          }),
        ],
      },
    })
  );

  const chart = page.getByRole("region", { name: "Livros por ano" });
  await page.goto("/dados");
  await chart
    .getByRole("link", { name: "Ver livros sem ano de leitura" })
    .click();
  await expect(
    page.getByText("Sem ano de leitura", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Livro sem ano registrado", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText("Livro sem data registrada", { exact: true })
  ).toHaveCount(0);

  await page.goto("/dados");
  await chart.getByRole("tab", { name: "Adquiridos" }).click();
  await chart
    .getByRole("link", { name: "Ver livros sem data de aquisição" })
    .click();
  await expect(
    page.getByText("Sem data de aquisição", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Livro sem data registrada", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText("Livro sem ano registrado", { exact: true })
  ).toHaveCount(0);
});

test("/dados · setas rolam os anos sem mudar de card no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/books", (route) =>
    route.fulfill({
      json: {
        books: [
          makeBook({ acquiredOn: "1996-01-01" }),
          makeBook({ acquiredOn: "2026-01-01" }),
        ],
      },
    })
  );

  await page.goto("/dados");
  const fifthCard = page.getByRole("button", { name: "Ir para o item 5" });
  await fifthCard.click();
  await expect(fifthCard).toHaveAttribute("aria-current", "true");
  await page.getByRole("tab", { name: "Adquiridos" }).click();
  const plot = page.getByRole("group", {
    name: "Contagem de livros por ano de aquisição",
  });
  await expect(plot.getByRole("listitem")).toHaveCount(31);
  await plot.press("ArrowRight");
  await expect
    .poll(() => plot.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect(fifthCard).toHaveAttribute("aria-current", "true");
});
