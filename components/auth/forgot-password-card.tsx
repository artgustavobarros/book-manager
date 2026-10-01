"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { forgotPasswordSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

export function ForgotPasswordCard() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<{ code?: string; status?: number } | null>(null);
  const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  return (
    <div className={authCardClass}>
      <AuthHeading title="Esqueci minha senha" sub="Informe o e-mail da conta e enviaremos um link para criar uma nova senha." />
      {sent ? (
        <AuthNotice>Se houver uma conta com esse e-mail, enviamos um link. Ele vale por 1 hora.</AuthNotice>
      ) : (
        <form
          noValidate
          className="contents"
          onSubmit={form.handleSubmit(async ({ email }) => {
            setError(null);
            const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
            if (error) return setError(error);
            setSent(true);
          })}
        >
          <FieldLabel label="E-mail" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              className="h-11"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
          </FieldLabel>
          {error ? <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice> : null}
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      )}
      <Link href="/entrar" className="self-center text-xs font-semibold text-mute no-underline hover:text-ink">
        Voltar para entrar
      </Link>
    </div>
  );
}
