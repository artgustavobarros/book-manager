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
import { resetPasswordSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

export function ResetPasswordCard({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(null);
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm: "" } });

  if (!token) {
    return (
      <div className={authCardClass}>
        <AuthHeading title="Link inválido ou expirado" sub="O link de redefinição já foi usado ou passou da validade de 1 hora." />
        <Button asChild size="lg">
          <Link href="/esqueci-senha" className="text-card no-underline hover:text-card">
            Pedir um novo link
          </Link>
        </Button>
        <Link href="/entrar" className="self-center text-xs font-semibold text-mute no-underline hover:text-ink">
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <div className={authCardClass}>
      <AuthHeading title="Crie uma nova senha" sub="Ao salvar, as sessões abertas em outros aparelhos serão encerradas." />
      <form
        noValidate
        className="contents"
        onSubmit={form.handleSubmit(async ({ password }) => {
          setError(null);
          const { error } = await authClient.resetPassword({ newPassword: password, token });
          if (error) return setError(error);
          router.replace("/entrar?aviso=senha-redefinida");
        })}
      >
        <div className="flex flex-col gap-3">
          <FieldLabel label="Nova senha" error={form.formState.errors.password?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="h-11"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
          </FieldLabel>
          <FieldLabel label="Confirmar nova senha" error={form.formState.errors.confirm?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              className="h-11"
              aria-invalid={!!form.formState.errors.confirm}
              {...form.register("confirm")}
            />
          </FieldLabel>
        </div>
        {error ? <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice> : null}
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
