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
import { useSingleFlight } from "@/hooks/use-single-flight";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

import { AuthHeading, AuthNotice, authCardClass } from "./auth-ui";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Bem-vindo de volta",
    sub: "Entre para acessar seu acervo.",
    btn: "Entrar",
  },
  signup: {
    title: "Crie sua conta",
    sub: "Comece a catalogar os livros da sua estante.",
    btn: "Criar conta",
  },
} as const;

const inputClass = "h-11";

const PANEL_ID = "auth-panel";
const tabId = (m: Mode) => "auth-tab-" + m;

/** Abas Entrar / Criar conta (padrão ARIA de abas: setas trocam a aba ativa). */
function Segmented({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const tabs: [Mode, string][] = [
    ["login", "Entrar"],
    ["signup", "Criar conta"],
  ];
  return (
    <div
      aria-label="Entrar ou criar conta"
      className="flex gap-0.5 rounded-xl bg-seg p-1"
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          return;
        }
        e.preventDefault();
        const next: Mode =
          e.key === "Home"
            ? "login"
            : e.key === "End"
              ? "signup"
              : mode === "login"
                ? "signup"
                : "login";
        onChange(next);
        document.getElementById(tabId(next))?.focus();
      }}
      role="tablist"
    >
      {tabs.map(([k, label]) => (
        <button
          aria-controls={PANEL_ID}
          aria-selected={mode === k}
          className={cn(
            "h-9 flex-1 rounded-lg border-0 font-semibold text-sm transition-[background-color,color] duration-200 focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none",
            mode === k
              ? "bg-card text-ink shadow-seg"
              : "bg-transparent text-mute"
          )}
          id={tabId(k)}
          key={k}
          onClick={() => onChange(k)}
          role="tab"
          tabIndex={mode === k ? 0 : -1}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GoogleButton({
  enabled,
  callbackURL,
}: {
  enabled: boolean;
  callbackURL: string;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="flex h-11 items-center justify-center gap-3 rounded-lg border border-line2 bg-card font-semibold text-ink text-sm transition-[border-color] duration-200 hover:border-ink focus-visible:shadow-[0_0_0_3px_rgba(127,120,110,.35)] focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
        disabled={busy}
        onClick={async () => {
          if (!enabled) {
            setMsg(
              "O login com Google não está disponível neste ambiente. Use e-mail e senha."
            );
            return;
          }
          setBusy(true);
          // Em caso de sucesso o navegador sai para o Google; o botão fica travado até lá.
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL,
            errorCallbackURL: "/entrar",
          });
          if (error) {
            setBusy(false);
            setMsg(authErrorMessage(error));
          }
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full border border-line2 font-bold text-xs"
        >
          G
        </span>
        <span>{busy ? "Abrindo o Google…" : "Entrar com Google"}</span>
      </button>
      {msg ? <AuthNotice>{msg}</AuthNotice> : null}
    </>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-mute text-xs">
      <span className="h-px flex-1 bg-line" />
      <span>ou com e-mail</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function LoginForm({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(
    null
  );
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;
  const submitOnce = useSingleFlight();

  return (
    <form
      className="contents"
      noValidate
      onSubmit={handleSubmit((values) =>
        submitOnce(async () => {
          setError(null);
          const { error } = await authClient.signIn.email({
            ...values,
            callbackURL,
          });
          if (error) {
            return setError(error);
          }
          router.replace(callbackURL);
          router.refresh();
        })
      )}
    >
      <div className="flex flex-col gap-3">
        <FieldLabel error={formState.errors.email?.message} label="E-mail">
          <Input
            aria-invalid={!!formState.errors.email}
            autoComplete="email"
            className={inputClass}
            placeholder="voce@email.com"
            type="email"
            {...register("email")}
          />
        </FieldLabel>
        <div className="flex flex-col gap-2 font-medium text-mute text-xs">
          {/* "Esqueci minha senha" na linha do rótulo: não altera a altura do cartão do design. */}
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password">Senha</label>
            <Link
              className="font-semibold text-mute text-xs no-underline hover:text-ink"
              href="/esqueci-senha"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            aria-invalid={!!formState.errors.password}
            autoComplete="current-password"
            className={inputClass}
            id="login-password"
            placeholder="••••••••"
            type="password"
            {...register("password")}
          />
          {formState.errors.password ? (
            <span className="font-normal text-acc text-xs" role="alert">
              {formState.errors.password.message}
            </span>
          ) : null}
        </div>
      </div>
      {error ? (
        <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice>
      ) : null}
      <Button
        className="active:scale-[.98]"
        disabled={formState.isSubmitting}
        size="lg"
        type="submit"
      >
        {formState.isSubmitting ? "Entrando…" : COPY.login.btn}
      </Button>
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<{ code?: string; status?: number } | null>(
    null
  );
  const [signInError, setSignInError] = useState<{
    code?: string;
    status?: number;
  } | null>(null);
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });
  const { register, handleSubmit, formState } = form;
  const submitOnce = useSingleFlight();

  return (
    <form
      className="contents"
      noValidate
      onSubmit={handleSubmit(({ name, email, password }) =>
        submitOnce(async () => {
          setError(null);
          setSignInError(null);
          const { error } = await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: "/verifique-email",
          });
          if (error) {
            return setError(error);
          }
          // O cadastro devolve resposta genérica para e-mails já existentes.
          // Só abrimos o acervo após autenticar de fato com as credenciais.
          const signedIn = await authClient.signIn.email({ email, password });
          if (signedIn.error) {
            setSignInError(signedIn.error);
            return;
          }
          router.replace("/");
          router.refresh();
        })
      )}
    >
      <div className="flex flex-col gap-3">
        <FieldLabel error={formState.errors.name?.message} label="Nome">
          <Input
            aria-invalid={!!formState.errors.name}
            autoComplete="name"
            className={inputClass}
            placeholder="Como podemos te chamar?"
            {...register("name")}
          />
        </FieldLabel>
        <FieldLabel error={formState.errors.email?.message} label="E-mail">
          <Input
            aria-invalid={!!formState.errors.email}
            autoComplete="email"
            className={inputClass}
            placeholder="voce@email.com"
            type="email"
            {...register("email")}
          />
        </FieldLabel>
        <FieldLabel error={formState.errors.password?.message} label="Senha">
          <Input
            aria-invalid={!!formState.errors.password}
            autoComplete="new-password"
            className={inputClass}
            placeholder="••••••••"
            type="password"
            {...register("password")}
          />
        </FieldLabel>
        <FieldLabel
          error={formState.errors.confirm?.message}
          label="Confirmar senha"
        >
          <Input
            aria-invalid={!!formState.errors.confirm}
            autoComplete="new-password"
            className={inputClass}
            placeholder="••••••••"
            type="password"
            {...register("confirm")}
          />
        </FieldLabel>
      </div>
      {error ? (
        <AuthNotice tone="error">{authErrorMessage(error)}</AuthNotice>
      ) : null}
      {signInError ? (
        <AuthNotice tone="error">
          {signInError.status === 401 ? (
            <>
              Não foi possível entrar com essa senha. Se você já tinha cadastro,
              use a senha anterior ou redefina a senha.
            </>
          ) : signInError.status === 429 ? (
            <>
              Muitas tentativas. Aguarde um minuto. Sua conta pode ter sido
              criada; depois, tente entrar com a senha informada.
            </>
          ) : (
            <>
              Não foi possível entrar agora. Sua conta pode ter sido criada;
              tente entrar novamente em instantes.
            </>
          )}{" "}
          <Link className="font-semibold text-ink underline" href="/entrar">
            Entrar
          </Link>{" "}
          ou{" "}
          <Link
            className="font-semibold text-ink underline"
            href="/esqueci-senha"
          >
            redefinir senha
          </Link>
          .
        </AuthNotice>
      ) : null}
      <Button
        className="active:scale-[.98]"
        disabled={formState.isSubmitting}
        size="lg"
        type="submit"
      >
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
          if (m === "signup") {
            url.searchParams.set("modo", "cadastro");
          } else {
            url.searchParams.delete("modo");
          }
          window.history.replaceState(null, "", url);
        }}
      />
      <AuthHeading sub={copy.sub} title={copy.title} />
      {notice ? <AuthNotice>{notice}</AuthNotice> : null}
      {oauthError ? (
        <AuthNotice tone="error">{oauthErrorMessage(oauthError)}</AuthNotice>
      ) : null}
      <GoogleButton callbackURL={callbackURL} enabled={googleEnabled} />
      <Divider />
      <div
        aria-labelledby={tabId(mode)}
        className="contents"
        id={PANEL_ID}
        role="tabpanel"
      >
        {mode === "login" ? (
          <LoginForm callbackURL={callbackURL} />
        ) : (
          <SignupForm />
        )}
      </div>
    </div>
  );
}
