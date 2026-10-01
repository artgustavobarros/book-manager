"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

type Mode = "login" | "signup";

const COPY = {
  login: { title: "Bem-vindo de volta", sub: "Entre para acessar seu acervo.", btn: "Entrar" },
  signup: { title: "Crie sua conta", sub: "Comece a catalogar os livros da sua estante.", btn: "Criar conta" },
} as const;

const inputClass = "h-11";

function Segmented({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabs: [Mode, string][] = [
    ["login", "Entrar"],
    ["signup", "Criar conta"],
  ];
  return (
    <div role="tablist" className="flex gap-0.5 rounded-xl bg-seg p-1">
      {tabs.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={mode === k}
          onClick={() => onChange(k)}
          className={cn(
            "h-9 flex-1 rounded-lg border-0 text-sm font-semibold transition-[background-color,color] duration-200 focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none",
            mode === k ? "bg-card text-ink shadow-seg" : "bg-transparent text-mute",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GoogleButton({ enabled, callbackURL }: { enabled: boolean; callbackURL: string }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (!enabled) {
            setMsg("O login com Google não está disponível neste ambiente. Use e-mail e senha.");
            return;
          }
          await authClient.signIn.social({ provider: "google", callbackURL, errorCallbackURL: "/entrar" });
        }}
        className="flex h-11 items-center justify-center gap-3 rounded-lg border border-line2 bg-card text-sm font-semibold text-ink transition-[border-color] duration-200 hover:border-ink focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full border border-line2 text-xs font-bold"
        >
          G
        </span>
        <span>Entrar com Google</span>
      </button>
      {msg ? <AuthNotice>{msg}</AuthNotice> : null}
    </>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-mute">
      <span className="h-px flex-1 bg-line" />
      <span>ou com e-mail</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function LoginForm({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(null);
  const [resent, setResent] = useState(false);
  const form = useForm({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, formState, getValues } = form;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        setResent(false);
        const { error } = await authClient.signIn.email({ ...values, callbackURL });
        if (error) return setError(error);
        router.replace(callbackURL);
        router.refresh();
      })}
      className="contents"
    >
      <div className="flex flex-col gap-3">
        <FieldLabel label="E-mail" error={formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            className={inputClass}
            aria-invalid={!!formState.errors.email}
            {...register("email")}
          />
        </FieldLabel>
        <FieldLabel label="Senha" error={formState.errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
            aria-invalid={!!formState.errors.password}
            {...register("password")}
          />
        </FieldLabel>
        <Link href="/esqueci-senha" className="self-end text-xs font-semibold text-mute no-underline hover:text-ink">
          Esqueci minha senha
        </Link>
      </div>
      {error ? (
        <AuthNotice tone="error">
          {authErrorMessage(error)}
          {error.code === "EMAIL_NOT_VERIFIED" ? (
            <>
              {" "}
              {resent ? (
                <strong className="font-semibold">Enviamos um novo link.</strong>
              ) : (
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-xs font-semibold text-ink underline hover:text-acc"
                  onClick={async () => {
                    await authClient.sendVerificationEmail({ email: getValues("email"), callbackURL: "/verifique-email" });
                    setResent(true);
                  }}
                >
                  Reenviar e-mail de verificação
                </button>
              )}
            </>
          ) : null}
        </AuthNotice>
      ) : null}
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="active:scale-[.98]">
        {formState.isSubmitting ? "Entrando…" : COPY.login.btn}
      </Button>
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(null);
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });
  const { register, handleSubmit, formState } = form;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ name, email, password }) => {
        setError(null);
        const { error } = await authClient.signUp.email({ name, email, password, callbackURL: "/verifique-email" });
        if (error) return setError(error);
        router.push("/verifique-email?email=" + encodeURIComponent(email));
      })}
      className="contents"
    >
      <div className="flex flex-col gap-3">
        <FieldLabel label="Nome" error={formState.errors.name?.message}>
          <Input
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            className={inputClass}
            aria-invalid={!!formState.errors.name}
            {...register("name")}
          />
        </FieldLabel>
        <FieldLabel label="E-mail" error={formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            className={inputClass}
            aria-invalid={!!formState.errors.email}
            {...register("email")}
          />
        </FieldLabel>
        <FieldLabel label="Senha" error={formState.errors.password?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
            aria-invalid={!!formState.errors.password}
            {...register("password")}
          />
        </FieldLabel>
        <FieldLabel label="Confirmar senha" error={formState.errors.confirm?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
            aria-invalid={!!formState.errors.confirm}
            {...register("confirm")}
          />
        </FieldLabel>
      </div>
      {error ? <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice> : null}
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="active:scale-[.98]">
        {formState.isSubmitting ? "Criando…" : COPY.signup.btn}
      </Button>
    </form>
  );
}

export function SignInCard({
  initialMode,
  googleEnabled,
  callbackURL,
  oauthError,
  notice,
}: {
  initialMode: Mode;
  googleEnabled: boolean;
  callbackURL: string;
  oauthError?: string;
  notice?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const copy = COPY[mode];
  return (
    <div className={authCardClass}>
      <Segmented
        mode={mode}
        onChange={(m) => {
          setMode(m);
          const url = new URL(window.location.href);
          if (m === "signup") url.searchParams.set("modo", "cadastro");
          else url.searchParams.delete("modo");
          window.history.replaceState(null, "", url);
        }}
      />
      <AuthHeading title={copy.title} sub={copy.sub} />
      {notice ? <AuthNotice>{notice}</AuthNotice> : null}
      {oauthError ? <AuthNotice tone="error">{oauthErrorMessage(oauthError)}</AuthNotice> : null}
      <GoogleButton enabled={googleEnabled} callbackURL={callbackURL} />
      <Divider />
      {mode === "login" ? <LoginForm callbackURL={callbackURL} /> : <SignupForm />}
    </div>
  );
}
