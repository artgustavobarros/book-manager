/** Templates de e-mail com a paleta do design (estilos inline para clientes de e-mail). */
import type { EmailMessage } from "./index";

const C = { bg: "#f4f2ee", card: "#ffffff", ink: "#1b1a17", mute: "#6f695f", line: "#e6e1d8", acc: "#b5452c" };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({ title, intro, cta, url, outro }: { title: string; intro: string; cta: string; url: string; outro: string }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:32px 16px;background:${C.bg};font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;color:${C.ink}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:${C.card};border:1px solid ${C.line};border-radius:16px">
      <tr><td style="padding:28px">
        <div style="font-size:18px;font-weight:700;margin-bottom:24px">
          <span style="display:inline-block;width:6px;height:18px;background:${C.ink};border-radius:2px;vertical-align:bottom"></span>
          <span style="display:inline-block;width:6px;height:14px;border:1.5px solid ${C.ink};border-radius:2px;vertical-align:bottom;box-sizing:border-box"></span>
          <span style="display:inline-block;width:6px;height:22px;background:${C.acc};border-radius:2px;vertical-align:bottom;margin-right:8px"></span>Bodega Literária
        </div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700">${escapeHtml(title)}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:${C.mute}">${escapeHtml(intro)}</p>
        <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:${C.ink};color:${C.card};border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(cta)}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${C.mute}">${escapeHtml(outro)}<br>Se o botão não funcionar, copie este link: <span style="word-break:break-all">${safeUrl}</span></p>
        <p style="margin:16px 0 0;font-size:12px;color:${C.mute}">Se não foi você, ignore este e-mail.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function text(lines: string[]) {
  return [...lines, "", "Se não foi você, ignore este e-mail.", "— Bodega Literária"].join("\n");
}

export function verificationEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme seu e-mail · Bodega Literária",
    html: layout({
      title: "Confirme seu e-mail",
      intro: "Falta só um passo para começar a catalogar os livros da sua estante.",
      cta: "Confirmar e-mail",
      url,
      outro: "O link vale por 24 horas.",
    }),
    text: text(["Confirme seu e-mail para entrar na Bodega Literária:", url, "", "O link vale por 24 horas."]),
  };
}

export function resetPasswordEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Redefinir senha · Bodega Literária",
    html: layout({
      title: "Redefinir sua senha",
      intro: "Recebemos um pedido para redefinir a senha da sua conta.",
      cta: "Criar nova senha",
      url,
      outro: "O link vale por 1 hora e só pode ser usado uma vez.",
    }),
    text: text(["Para criar uma nova senha, abra:", url, "", "O link vale por 1 hora e só pode ser usado uma vez."]),
  };
}

export function changeEmailEmail(to: string, newEmail: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme o novo e-mail · Bodega Literária",
    html: layout({
      title: "Confirme o novo e-mail",
      intro: `Para passar a usar ${newEmail} na sua conta, confirme pelo botão abaixo.`,
      cta: "Confirmar novo e-mail",
      url,
      outro: "Até a confirmação, o e-mail atual continua valendo.",
    }),
    text: text([`Para passar a usar ${newEmail} na sua conta, abra:`, url]),
  };
}
