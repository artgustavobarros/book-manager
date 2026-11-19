import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../support/e2e";

test.use({ storageState: AUTH_STATE });

test("a conta mostra o controle da cópia semanal e protege as rotas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Configurações" }).click();
  await page.getByRole("tab", { name: "Dados e backup" }).click();
  const section = page.getByRole("region", {
    name: "Cópia semanal no Google Sheets",
  });
  await expect(section).toBeVisible();
  await expect(
    section.getByText(
      "A conexão com Google não está disponível neste ambiente."
    )
  ).toBeVisible();
  const state = await page.request.get("/api/sheets-export");
  expect(state.status()).toBe(200);
  expect((await state.json()).status).toBe("off");
  const unauthorized = await page.request.get("/api/cron/sheets-export");
  expect(unauthorized.status()).toBe(401);

  await page.goto("/api/sheets-export/callback?error=denied");
  await expect(page).toHaveURL("/configuracoes?secao=dados");
  await expect(section).toBeVisible();
  await expect(page.getByText("Conexão com Google cancelada")).toBeVisible();
});
