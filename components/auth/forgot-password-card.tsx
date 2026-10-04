"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/text-field";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { forgotPasswordSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

export function ForgotPasswordCard() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<{ code?: string; status?: number } | null>(
    null
  );
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const submitOnce = useSingleFlight();

  return (
    <div className={authCardClass}>
      <AuthHeading
        sub="Informe o e-mail da conta e enviaremos um link para criar uma nova senha."
        title="Esqueci minha senha"
      />
      {sent ? (
        <AuthNotice>
          Se houver uma conta com esse e-mail, enviamos um link. Ele vale por 1
          hora.
        </AuthNotice>
      ) : (
        <form
          className="contents"
          noValidate
          onSubmit={form.handleSubmit(({ email }) =>
            submitOnce(async () => {
              setError(null);
              const { error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/redefinir-senha",
              });
              if (error) {
                return setError(error);
              }
              setSent(true);
            })
          )}
        >
          <FieldLabel
            error={form.formState.errors.email?.message}
            label="E-mail"
          >
            <Input
              aria-invalid={!!form.formState.errors.email}
              autoComplete="email"
              className="h-11"
              placeholder="voce@email.com"
              type="email"
              {...form.register("email")}
            />
          </FieldLabel>
          {error ? (
            <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice>
          ) : null}
          <Button
            disabled={form.formState.isSubmitting}
            size="lg"
            type="submit"
          >
            {form.formState.isSubmitting ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      )}
      <Link
        className="self-center font-semibold text-mute text-xs no-underline hover:text-ink"
        href="/entrar"
      >
        Voltar para entrar
      </Link>
    </div>
  );
}
