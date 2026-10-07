import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

export const REFERENCE_USER = {
  email: "ana@exemplo.com",
  password: "senha-forte-123",
  name: "Ana Lima",
};
export const AUTH_STATE = ".data/e2e-auth.json";
const OUTBOX = ".data/outbox-e2e.jsonl";

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
