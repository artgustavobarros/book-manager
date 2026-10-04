import { expect, test } from "@playwright/test";

import {
  linkFrom,
  REFERENCE_USER,
  signIn,
  uniqueEmail,
  waitForEmail,
} from "../support/e2e";

test.describe("autenticação", () => {
  test("cadastro abre o Painel e confirmação em outra aba remove o aviso", async ({
    page,
  }) => {
    const email = uniqueEmail("novo");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Bia Souza");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();

    await expect(page).toHaveURL("/");
    const banner = page.getByRole("region", {
      name: "Confirmação de e-mail pendente",
    });
    await expect(banner).toContainText(email);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bia");
    await banner.getByRole("button", { name: "Já confirmei" }).click();
    await expect(banner).toContainText("A confirmação ainda não consta");
    await page.goto(
      "/verifique-email?error=INVALID_TOKEN&email=" + encodeURIComponent(email)
    );
    await expect(
      page.getByRole("heading", { name: "Link inválido ou expirado" })
    ).toBeVisible();
    await page.goto("/");

    const mail = await waitForEmail(email, "Confirme seu e-mail");
    const otherTab = await page.context().newPage();
    await otherTab.goto(linkFrom(mail.text));
    await expect(otherTab).toHaveURL("/");
    await page.bringToFront();
    expect(
      await (await page.request.get("/api/account/verification")).json()
    ).toEqual({ emailVerified: true });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(banner).toHaveCount(0);

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

  test("Já confirmei remove o aviso após o servidor registrar a confirmação", async ({
    page,
  }) => {
    const email = uniqueEmail("confirmado");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Eva");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    const banner = page.getByRole("region", {
      name: "Confirmação de e-mail pendente",
    });
    const mail = await waitForEmail(email, "Confirme seu e-mail");
    await page.request.get(linkFrom(mail.text));
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Já confirmei" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(banner).toHaveCount(0);
  });

  test("aviso no mobile fecha temporariamente, reaparece e permite reenvio e login", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = uniqueEmail("pendente");
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Cris");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
    await page.getByLabel("Confirmar senha").fill("senha-forte-123");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    const banner = page.getByRole("region", {
      name: "Confirmação de e-mail pendente",
    });
    await expect(banner).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await banner.getByRole("button", { name: "Fechar aviso" }).focus();
    await page.keyboard.press("Enter");
    await expect(banner).toHaveCount(0);
    await page.getByRole("link", { name: "Estante", exact: true }).click();
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Reenviar e-mail" }).click();
    await expect(banner).toContainText("Enviamos um novo link");
    await banner.getByRole("button", { name: "Fechar aviso" }).click();
    await page.reload();
    await expect(banner).toBeVisible();
    await page.goto("/dados");
    await expect(banner).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, email, "senha-forte-123");
    await expect(page).toHaveURL("/");
    await expect(banner).toBeVisible();
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

  test("cadastro com e-mail existente orienta entrada e recuperação", async ({
    page,
  }) => {
    await page.goto("/entrar?modo=cadastro");
    await page.getByLabel("Nome").fill("Outra pessoa");
    await page.getByLabel("E-mail").fill(REFERENCE_USER.email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-nova-456");
    await page.getByLabel("Confirmar senha").fill("senha-nova-456");
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    const notice = page.locator("form").getByRole("alert");
    await expect(notice).toContainText("Se você já tinha cadastro");
    await expect(notice.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/entrar"
    );
    await notice.getByRole("link", { name: "redefinir senha" }).click();
    await expect(page).toHaveURL("/esqueci-senha");
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
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("region", { name: "Confirmação de e-mail pendente" })
    ).toBeVisible();

    await page.context().clearCookies();
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
