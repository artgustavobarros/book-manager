/**
 * Templates de e-mail no tema escuro do design (tokens de `:root[data-theme="dark"]`),
 * com estilos inline para clientes de e-mail.
 */
import type { EmailMessage } from "./index";

const C = {
  bg: "#161513",
  card: "#211f1c",
  ink: "#ece7de",
  mute: "#a39c90",
  line: "#34302a",
  seg: "#2a2723",
  acc: "#e1755a",
};

const FONT = "'Hanken Grotesk',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const FOOTER =
  "Você recebeu este e-mail porque há uma conta da Bodega Literária associada a este endereço. Este é um e-mail automático e não precisa ser respondido.";

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );

interface Content {
  cta: string;
  eyebrow: string;
  /** Aviso para quem não pediu o e-mail. */
  ignore: string;
  intro: string;
  /** Validade do link, logo abaixo do botão. */
  note: string;
  title: string;
  url: string;
}

function layout({ eyebrow, title, intro, cta, url, note, ignore }: Content) {
  const safeUrl = escapeHtml(url);
  const bar = (style: string) =>
    `<span style="display:inline-block;width:6px;border-radius:2px;vertical-align:bottom;box-sizing:border-box;${style}"></span>`;
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
<style>:root{color-scheme:dark}@media (max-width:480px){.card{padding:28px 22px!important}.foot{padding:20px 22px 0!important}h1{font-size:24px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px;font-family:${FONT};color:${C.ink}">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
      <tr><td style="padding:0 0 20px;font-size:18px;font-weight:700;color:${C.ink}">
        ${bar(`height:18px;background:${C.ink}`)}
        ${bar(`height:14px;border:1.5px solid ${C.ink}`)}
        ${bar(`height:24px;background:${C.acc};margin-right:8px`)}Bodega Literária
      </td></tr>
      <tr><td class="card" bgcolor="${C.card}" style="padding:40px;background:${C.card};border:1px solid ${C.line};border-radius:16px">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.acc}">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;font-weight:700;color:${C.ink}">${escapeHtml(title)}</h1>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:${C.ink}">${escapeHtml(intro)}</p>
        <a href="${safeUrl}" style="display:inline-block;padding:15px 28px;background:${C.ink};color:${C.bg};border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(cta)}</a>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:${C.mute}">${escapeHtml(note)}</p>
        <div style="margin:28px 0;border-top:1px solid ${C.line};height:0;line-height:0;font-size:0">&nbsp;</div>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${C.mute}">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
        <div style="padding:14px 16px;background:${C.seg};border-radius:8px;font-family:${MONO};font-size:13px;line-height:1.5;word-break:break-all"><a href="${safeUrl}" style="color:${C.ink};text-decoration:underline">${safeUrl}</a></div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${C.mute}">${escapeHtml(ignore)}</p>
      </td></tr>
      <tr><td class="foot" style="padding:24px 40px 0;font-size:12px;line-height:1.6;color:${C.mute}">${FOOTER}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function text({ eyebrow, title, intro, cta, url, note, ignore }: Content) {
  return [
    eyebrow.toUpperCase(),
    "",
    title,
    "",
    intro,
    "",
    `${cta}: ${url}`,
    "",
    note,
    "",
    ignore,
    "",
    "— Bodega Literária",
    FOOTER,
  ].join("\n");
}

function message(to: string, subject: string, content: Content): EmailMessage {
  return { to, subject, html: layout(content), text: text(content) };
}

export function verificationEmail(
  to: string,
  url: string,
  name?: string
): EmailMessage {
  const greeting = name?.trim();
  return message(to, "Confirme seu e-mail · Bodega Literária", {
    eyebrow: "Confirmação de cadastro",
    title: greeting
      ? `Olá, ${greeting}. Confirme seu e-mail`
      : "Confirme seu e-mail",
    intro:
      "Sua conta na Bodega Literária já está funcionando e tudo o que você registrar fica salvo. Para completar o cadastro, confirme que este endereço é seu.",
    cta: "Confirmar e-mail",
    url,
    note: "O link vale por 24 horas. Depois disso, peça um novo pelo aviso no app.",
    ignore:
      "Não criou esta conta? Ignore este e-mail; nenhum cadastro será confirmado sem o clique acima.",
  });
}

export function resetPasswordEmail(to: string, url: string): EmailMessage {
  return message(to, "Redefinir senha · Bodega Literária", {
    eyebrow: "Recuperação de senha",
    title: "Redefina sua senha",
    intro: `Recebemos um pedido para criar uma nova senha para a conta ${to}. Clique no botão abaixo para escolher a nova senha.`,
    cta: "Criar nova senha",
    url,
    note: "Por segurança, o link vale por 1 hora e só pode ser usado uma vez.",
    ignore:
      "Não pediu a troca? Ignore este e-mail. Sua senha atual continua valendo e ninguém consegue alterá-la sem este link.",
  });
}

export function changeEmailEmail(
  to: string,
  newEmail: string,
  url: string
): EmailMessage {
  return message(to, "Confirme o novo e-mail · Bodega Literária", {
    eyebrow: "Troca de e-mail",
    title: "Confirme o novo e-mail",
    intro: `Recebemos um pedido para passar a usar ${newEmail} na sua conta da Bodega Literária. Confirme que este endereço é seu para concluir a troca.`,
    cta: "Confirmar novo e-mail",
    url,
    note: "O link vale por 24 horas. Até a confirmação, o e-mail atual continua valendo.",
    ignore:
      "Não pediu a troca? Ignore este e-mail; o e-mail da conta só muda com o clique acima.",
  });
}

/** Lê o payload de um JWT sem validar a assinatura. */
function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")
    );
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/**
 * O Better Auth usa o mesmo callback para cadastro, reenvio e troca de e-mail.
 * Na troca, o token (gerado pelo próprio servidor) traz `updateTo` com o novo
 * endereço; payload ilegível cai no e-mail de cadastro.
 */
export function verificationMessage({
  user,
  url,
  token,
}: {
  user: { email: string; name?: string | null };
  url: string;
  token: string;
}): EmailMessage {
  const updateTo = jwtPayload(token)?.updateTo;
  return typeof updateTo === "string" && updateTo
    ? changeEmailEmail(user.email, updateTo, url)
    : verificationEmail(user.email, url, user.name ?? undefined);
}
