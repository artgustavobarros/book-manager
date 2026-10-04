"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { MIN_PASSWORD, resetPasswordSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

export function ResetPasswordCard({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(
    null
  );
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className={authCardClass}>
        <AuthHeading
          sub="O link de redefinição já foi usado ou passou da validade de 1 hora."
          title="Link inválido ou expirado"
        />
        <Button asChild size="lg">
          <Link
            className="text-card no-underline hover:text-card"
            href="/esqueci-senha"
          >
            Pedir um novo link
          </Link>
        </Button>
        <Link
          className="self-center font-semibold text-mute text-xs no-underline hover:text-ink"
          href="/entrar"
        >
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <div className={authCardClass}>
      <AuthHeading
        sub="Ao salvar, as sessões abertas em outros aparelhos serão encerradas."
        title="Crie uma nova senha"
      />
      <form
        className="contents"
        noValidate
        onSubmit={form.handleSubmit(async ({ password }) => {
          setError(null);
          const { error } = await authClient.resetPassword({
            newPassword: password,
            token,
          });
          if (error) {
            return setError(error);
          }
          router.replace("/entrar?aviso=senha-redefinida");
        })}
      >
        <div className="flex flex-col gap-3">
          <FieldLabel
            error={form.formState.errors.password?.message}
            label="Nova senha"
          >
            <Input
              aria-invalid={!!form.formState.errors.password}
              autoComplete="new-password"
              className="h-11"
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              type="password"
              {...form.register("password")}
            />
          </FieldLabel>
          <FieldLabel
            error={form.formState.errors.confirm?.message}
            label="Confirmar nova senha"
          >
            <Input
              aria-invalid={!!form.formState.errors.confirm}
              autoComplete="new-password"
              className="h-11"
              type="password"
              {...form.register("confirm")}
            />
          </FieldLabel>
        </div>
        {error ? (
          <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice>
        ) : null}
        <Button disabled={form.formState.isSubmitting} size="lg" type="submit">
          {form.formState.isSubmitting ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
