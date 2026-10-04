import { expect, test } from "@playwright/test";

import { uniqueEmail } from "../support/e2e";

test("avatar mostra a foto salva e usa iniciais quando ela falha", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://avatar.example.test/foto.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="red"/></svg>',
    })
  );
  await page.route("https://avatar.example.test/falha.png", (route) =>
    route.fulfill({ status: 404 })
  );

  await page.goto("/entrar?modo=cadastro");
  await page.getByLabel("Nome").fill("Beatriz Lima");
  await page.getByLabel("E-mail").fill(uniqueEmail("avatar"));
  await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
  await page.getByLabel("Confirmar senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL("/");

  const button = page.getByRole("button", { name: "Minha conta" });
  await expect(button).toContainText("BL");

  async function setImage(image: string) {
    const status = await page.evaluate(async (url) => {
      const response = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      return response.status;
    }, image);
    expect(status).toBe(200);
    await page.reload();
  }

  await setImage("https://avatar.example.test/foto.png");
  await expect(button.locator("img")).toBeVisible();
  await expect
    .poll(() =>
      button
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth)
    )
    .toBeGreaterThan(0);
  await button.click();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();

  await setImage("https://avatar.example.test/falha.png");
  await expect(button).toContainText("BL");
  await button.click();
  await expect(page.getByRole("dialog")).toContainText("BL");
});
