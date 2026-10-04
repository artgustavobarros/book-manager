import { expect, test } from "@playwright/test";

import { linkFrom, signIn, uniqueEmail, waitForEmail } from "../support/e2e";

test.describe("autenticação", () => {
  test("cadastro → e-mail de verificação → Painel vazio", async ({ page }) => {
    const email = uniqueEmail("novo");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Bia Souza");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Verifique seu e-mail" })
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    const mail = await waitForEmail(email, "Confirme seu e-mail");
    await page.goto(linkFrom(mail.text));
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bia");

    await page.getByRole("link", { name: "Estante", exact: true }).click();
    await expect(page.getByText("Sua estante está vazia")).toBeVisible();
    await page.goto("/dados");
    await expect(
      page.getByText("Ainda não há dados para mostrar")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Me surpreenda" })
    ).toBeDisabled();
  });

  test("login bloqueado antes de verificar, com reenvio", async ({ page }) => {
    const email = uniqueEmail("pendente");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Cris");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Verifique seu e-mail" })
    ).toBeVisible();

    await signIn(page, email, "senha-forte-123");
    await expect(
      page.getByText("Confirme seu e-mail antes de entrar")
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reenviar e-mail de verificação" })
      .click();
    await expect(page.getByText("Enviamos um novo link.")).toBeVisible();
  });

  test("validação do cadastro e credenciais erradas", async ({ page }) => {
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("X");
    await page.getByLabel("E-mail").fill("x@exemplo.com");
    await page.getByLabel("Senha", { exact: true }).fill("12345678");
    await page.getByLabel("Confirmar senha").fill("87654321");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(page.getByText("As senhas não conferem.")).toBeVisible();

    await signIn(page, "ninguem@exemplo.com", "qualquer-senha");
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("esqueci a senha → nova senha → entra com ela", async ({ page }) => {
    const email = uniqueEmail("reset");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Dani");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Verifique seu e-mail" })
    ).toBeVisible();

    await page.goto("/esqueci-senha");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(
      page.getByText("Se houver uma conta com esse e-mail")
    ).toBeVisible();

    const mail = await waitForEmail(email, "Redefinir senha");
    await page.goto(linkFrom(mail.text));
    await expect(
      page.getByRole("heading", { name: "Crie uma nova senha" })
    ).toBeVisible();
    await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-456");
    await page.getByLabel("Confirmar nova senha").fill("nova-senha-456");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(
      page.getByText("Senha redefinida. Entre com a nova senha.")
    ).toBeVisible();

    // Redefinir prova a posse do e-mail: a conta fica verificada e o login funciona.
    await signIn(page, email, "nova-senha-456");
    await expect(page).toHaveURL("/");
  });

  test("link de redefinição inválido", async ({ page }) => {
    await page.goto("/redefinir-senha?error=INVALID_TOKEN");
    await expect(
      page.getByRole("heading", { name: "Link inválido ou expirado" })
    ).toBeVisible();
  });

  test("sem sessão: páginas redirecionam e a API responde 401", async ({
    page,
    request,
  }) => {
    await page.goto("/estante");
    await expect(page).toHaveURL(/\/entrar\?voltar=%2Festante/);
    expect((await request.get("/api/books")).status()).toBe(401);
  });
});
