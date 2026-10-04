import { MIN_PASSWORD } from "@/lib/validation/auth";

/** Mensagens em pt-BR para os erros do Better Auth exibidos nas telas de entrada. */
export function authErrorMessage(
  error: { code?: string; status?: number; message?: string } | null | undefined
): string {
  if (!error) {
    return "";
  }
  if (error.status === 429) {
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "E-mail ou senha incorretos.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirme seu e-mail antes de entrar. Procure o link na caixa de entrada (e no spam).";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Não foi possível criar a conta com este e-mail.";
    case "PASSWORD_TOO_SHORT":
      return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
    case "INVALID_TOKEN":
      return "Link inválido ou expirado.";
    default:
      return "Não foi possível concluir. Tente de novo em instantes.";
  }
}

/** Erros que voltam na URL após o OAuth do Google (`?error=`). */
export function oauthErrorMessage(code: string | undefined): string {
  if (!code) {
    return "";
  }
  if (code === "account_not_linked") {
    return "Já existe um cadastro com este e-mail aguardando confirmação. Confirme pelo link que enviamos ou use “Esqueci minha senha” para assumir a conta.";
  }
  return "Não foi possível entrar com o Google. Tente de novo.";
}
