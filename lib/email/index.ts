import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const FROM_NAME = "Bodega Literária";

/** Caixa de saída local usada pelos testes automatizados (EMAIL_TRANSPORT=outbox). */
export const OUTBOX_FILE = env.EMAIL_OUTBOX_FILE ?? path.join(process.cwd(), ".data", "outbox.jsonl");

let transporter: Transporter | null = null;

function gmail(): Transporter {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error("SMTP_USER e SMTP_PASS são obrigatórios com EMAIL_TRANSPORT=gmail.");
  }
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Envia um e-mail transacional. O transporte é escolhido por `EMAIL_TRANSPORT`:
 * `gmail` (produção), `console` (desenvolvimento) ou `outbox` (testes).
 * Para trocar de provedor (ex.: Resend), basta um novo caso aqui.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  switch (env.EMAIL_TRANSPORT) {
    case "gmail":
      await gmail().sendMail({
        from: { name: FROM_NAME, address: env.SMTP_USER! },
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return;
    case "outbox":
      await mkdir(path.dirname(OUTBOX_FILE), { recursive: true });
      await appendFile(OUTBOX_FILE, JSON.stringify({ ...message, sentAt: new Date().toISOString() }) + "\n");
      return;
    case "console":
      console.info(`\n✉️  [e-mail] Para: ${message.to}\n   Assunto: ${message.subject}\n\n${message.text}\n`);
      return;
  }
}
