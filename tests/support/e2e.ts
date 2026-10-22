import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Page } from "@playwright/test";

export const REFERENCE_USER = {
  email: "ana@exemplo.com",
  password: "senha-forte-123",
  name: "Ana Lima",
};
const runDir = process.env.BOOK_MANAGER_E2E_RUN_DIR;
if (!runDir) {
  throw new Error("BOOK_MANAGER_E2E_RUN_DIR não definido pelo Playwright.");
}

export const AUTH_STATE = join(runDir, "auth.json");
const OUTBOX = join(runDir, "outbox.jsonl");

/** Último e-mail para o destinatário (opcionalmente filtrando pelo assunto). */
export async function waitForEmail(
  to: string,
  subject?: string,
  timeoutMs = 10_000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const content = await readFile(OUTBOX, "utf8").catch(() => "");
    const found = content
      .split("\n")
      .filter(Boolean)
      .flatMap((l) => {
        try {
          return [
            JSON.parse(l) as { to: string; subject: string; text: string },
          ];
        } catch {
          return [];
        }
      })
      .reverse()
      .find((m) => m.to === to && (!subject || m.subject.includes(subject)));
    if (found) {
      return found;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Nenhum e-mail para ${to}`);
}

export function linkFrom(text: string): string {
  const m = text.match(/https?:\/\/\S+/);
  if (!m) {
    throw new Error("Link não encontrado");
  }
  return m[0];
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@exemplo.com`;

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

/** Escolhe a Leitura no primeiro seletor "Leitura" da página (Select do Base UI). */
export async function chooseFirstReading(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Leitura" }).first().click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

/** Abre a ficha do primeiro livro da página e escolhe a Situação nela. */
export async function chooseFirstSituation(page: Page, label: string) {
  await page.locator("[data-bid]").first().click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Situação" })
    .click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

/** Pedido de "com quem?" aberto ao escolher Emprestado. */
export function lendDialog(page: Page) {
  return page.getByRole("dialog", { name: "Emprestado para quem?" });
}
