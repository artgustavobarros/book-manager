import { z } from "zod";

export const MIN_PASSWORD = 8;

const email = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));
const password = z.string().min(MIN_PASSWORD, `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`).max(128);
const name = z.string().trim().min(1, "Informe seu nome.").max(100);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});

export const signUpSchema = z
  .object({ name, email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const profileSchema = z.object({ name, email });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Informe a senha atual."), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const deleteAccountSchema = z.object({ password: z.string() });
