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

/**
 * "Verifique seu e-mail" ou "Link inválido" (?error=…), sempre com
 * a opção de reenviar o link de verificação.
 */
export function VerifyEmailCard({
  email,
  invalid,
}: {
  email?: string;
  invalid: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<{ code?: string; status?: number } | null>(
    null
  );
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: email ?? "" },
  });

  return (
    <div className={authCardClass}>
      {invalid ? (
        <AuthHeading
          sub="O link de confirmação já foi usado ou passou da validade. Peça um novo abaixo."
          title="Link inválido ou expirado"
        />
      ) : (
        <AuthHeading
          sub={
            <>
              Enviamos um link de confirmação para{" "}
              <strong className="font-semibold text-ink">
                {email || "o seu e-mail"}
              </strong>
              . Abra-o para ativar a conta. Se não encontrar, olhe também o
              spam.
            </>
          }
          title="Verifique seu e-mail"
        />
      )}
      <form
        className="contents"
        noValidate
        onSubmit={form.handleSubmit(async ({ email }) => {
          setError(null);
          const { error } = await authClient.sendVerificationEmail({
            email,
            callbackURL: "/verifique-email",
          });
          if (error) {
            return setError(error);
          }
          setSent(true);
        })}
      >
        {invalid || !email ? (
          <FieldLabel
            error={form.formState.errors.email?.message}
            label="E-mail"
          >
            <Input
              aria-invalid={!!form.formState.errors.email}
              autoComplete="email"
              className="h-11"
              type="email"
              {...form.register("email")}
            />
          </FieldLabel>
        ) : null}
        {sent ? (
          <AuthNotice>
            Pronto: se houver um cadastro pendente com esse e-mail, um novo link
            chegará em instantes.
          </AuthNotice>
        ) : null}
        {error ? (
          <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice>
        ) : null}
        <Button
          disabled={form.formState.isSubmitting}
          size="lg"
          type="submit"
          variant="neutral"
        >
          {form.formState.isSubmitting ? "Enviando…" : "Reenviar e-mail"}
        </Button>
      </form>
      <Link
        className="self-center font-semibold text-mute text-xs no-underline hover:text-ink"
        href="/entrar"
      >
        Voltar para entrar
      </Link>
    </div>
  );
}
