"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Modal, ModalClose, useModalDraft } from "@/components/ui/dialog";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { changePasswordSchema, profileSchema } from "@/lib/validation/auth";

import { useApp } from "./app-provider";
import { toast } from "./toast";

const input =
  "h-10 rounded-lg border border-line2 bg-card px-3 text-sm text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink aria-invalid:border-acc";
const label = "flex flex-col gap-2 text-xs font-medium text-mute";
const sectionTitle = "text-xs font-bold tracking-[.1em] text-mute uppercase";

function Divider() {
  return <div className="h-px bg-line" />;
}

function Msg({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info";
}) {
  return (
    <span className={cn("text-sm", tone === "error" ? "text-acc" : "text-ink")}>
      {children}
    </span>
  );
}

function ProfileSection() {
  const app = useApp();
  const [msg, setMsg] = useState<{
    text: string;
    tone: "error" | "info";
  } | null>(null);
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: app.user.name, email: app.user.email },
  });
  const firstError =
    form.formState.errors.name?.message ?? form.formState.errors.email?.message;
  const submitOnce = useSingleFlight();
  useModalDraft(form.formState.isDirty);

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={form.handleSubmit(({ name, email }) =>
        submitOnce(async () => {
          setMsg(null);
          if (name !== app.user.name) {
            const { error } = await authClient.updateUser({ name });
            if (error) {
              return setMsg({ text: authErrorMessage(error), tone: "error" });
            }
            app.setUser({ name });
          }
          if (email !== app.user.email.toLowerCase()) {
            const { error } = await authClient.changeEmail({
              newEmail: email,
              callbackURL: "/",
            });
            if (error) {
              return form.setError("email", {
                message: "Não foi possível usar este e-mail.",
              });
            }
            setMsg({
              text: "Enviamos um link para confirmar o novo e-mail. Até lá, o atual continua valendo.",
              tone: "info",
            });
            form.reset({ name, email });
            return;
          }
          form.reset({ name, email });
          toast("Perfil atualizado");
        })
      )}
    >
      <span className={sectionTitle}>Perfil</span>
      <label className={label}>
        Nome
        <input
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
          autoComplete="name"
          className={input}
        />
      </label>
      <label className={label}>
        E-mail
        <input
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
          autoComplete="email"
          className={input}
          type="email"
        />
      </label>
      {firstError ? (
        <Msg>{firstError}</Msg>
      ) : msg ? (
        <Msg tone={msg.tone}>{msg.text}</Msg>
      ) : null}
      <div className="flex justify-end">
        <button
          className="h-10 rounded-lg border-0 bg-ink px-5 font-semibold text-card text-sm hover:bg-acc"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Salvar perfil
        </button>
      </div>
    </form>
  );
}

function PasswordSection() {
  const app = useApp();
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const e = form.formState.errors;
  const firstError =
    e.current?.message ??
    e.password?.message ??
    e.confirm?.message ??
    e.root?.message;
  const submitOnce = useSingleFlight();
  useModalDraft(form.formState.isDirty);

  if (!app.hasPassword) {
    return (
      <div className="flex flex-col gap-3">
        <span className={sectionTitle}>Alterar senha</span>
        <span className="text-mute text-sm leading-[1.5]">
          Você entra com o Google; esta conta não tem senha própria.
        </span>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={form.handleSubmit(({ current, password }) =>
        submitOnce(async () => {
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: password,
            revokeOtherSessions: true,
          });
          if (error) {
            if (error.code === "INVALID_PASSWORD") {
              return form.setError("current", {
                message: "A senha atual está incorreta.",
              });
            }
            return form.setError("root", { message: authErrorMessage(error) });
          }
          form.reset();
          toast("Senha alterada");
        })
      )}
    >
      <span className={sectionTitle}>Alterar senha</span>
      <label className={label}>
        Senha atual
        <input
          {...form.register("current")}
          aria-invalid={!!e.current}
          autoComplete="current-password"
          className={input}
          type="password"
        />
      </label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <label className={label}>
          Nova senha
          <input
            {...form.register("password")}
            aria-invalid={!!e.password}
            autoComplete="new-password"
            className={input}
            placeholder="Mínimo 8 caracteres"
            type="password"
          />
        </label>
        <label className={label}>
          Confirmar nova senha
          <input
            {...form.register("confirm")}
            aria-invalid={!!e.confirm}
            autoComplete="new-password"
            className={input}
            type="password"
          />
        </label>
      </div>
      {firstError ? <Msg>{firstError}</Msg> : null}
      <div className="flex justify-end">
        <button
          className="h-10 rounded-lg border border-ink bg-transparent px-5 font-semibold text-ink text-sm transition-[background-color,color] duration-200 hover:bg-ink hover:text-card"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Alterar senha
        </button>
      </div>
    </form>
  );
}

function GoogleSection() {
  const app = useApp();
  const [linked, setLinked] = useState(app.googleLinked);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <span className={sectionTitle}>Conta Google</span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-ink text-sm">
          {linked
            ? "Vinculada: você também pode entrar com o Google."
            : "Nenhuma conta Google vinculada."}
        </span>
        {linked ? (
          app.hasPassword ? (
            <button
              className="h-9 rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm hover:border-ink disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMsg("");
                const { data: accounts } = await authClient.listAccounts();
                const google = accounts?.find((a) => a.providerId === "google");
                if (!google) {
                  setBusy(false);
                  return setLinked(false);
                }
                const { error } = await authClient.unlinkAccount({
                  accountId: google.accountId,
                });
                setBusy(false);
                if (error) {
                  return setMsg(authErrorMessage(error));
                }
                setLinked(false);
                toast("Conta Google desvinculada");
              }}
              type="button"
            >
              {busy ? "Desvinculando…" : "Desvincular"}
            </button>
          ) : (
            <span className="text-mute text-xs">
              É o seu único meio de acesso.
            </span>
          )
        ) : (
          <button
            className="h-9 rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm hover:border-ink disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            onClick={async () => {
              if (!app.googleEnabled) {
                return setMsg(
                  "O login com Google não está disponível neste ambiente."
                );
              }
              setBusy(true);
              setMsg("");
              // Em caso de sucesso o navegador sai para o Google.
              const { error } = await authClient.linkSocial({
                provider: "google",
                callbackURL: "/",
              });
              if (error) {
                setBusy(false);
                setMsg(authErrorMessage(error));
              }
            }}
            type="button"
          >
            {busy ? "Abrindo o Google…" : "Vincular Google"}
          </button>
        )}
      </div>
      {msg ? <Msg>{msg}</Msg> : null}
    </div>
  );
}

function DeleteSection() {
  const app = useApp();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <span className={sectionTitle}>Excluir conta</span>
      <span className="text-mute text-sm leading-[1.5]">
        Apaga a conta e todos os seus livros, metas e configurações. Não dá para
        desfazer; salve um backup antes, se quiser.
      </span>
      {app.hasPassword ? (
        <label className={label}>
          Confirme com sua senha
          <input
            autoComplete="current-password"
            className={input}
            onChange={(e) => {
              setPassword(e.target.value);
              setMsg("");
            }}
            type="password"
            value={password}
          />
        </label>
      ) : null}
      {msg ? <Msg>{msg}</Msg> : null}
      <div className="flex justify-end">
        <button
          className="h-10 rounded-lg border-0 bg-transparent px-3 font-semibold text-acc text-sm hover:bg-hov"
          disabled={busy}
          onClick={async () => {
            if (app.hasPassword && !password) {
              return setMsg("Informe sua senha.");
            }
            if (!confirm) {
              return setConfirm(true);
            }
            setBusy(true);
            const { error } = await authClient.deleteUser(
              app.hasPassword ? { password } : {}
            );
            setBusy(false);
            if (error) {
              setConfirm(false);
              return setMsg(
                error.code === "INVALID_PASSWORD"
                  ? "Senha incorreta."
                  : error.code === "SESSION_EXPIRED"
                    ? "Por segurança, saia e entre de novo antes de excluir a conta."
                    : authErrorMessage(error)
              );
            }
            router.replace("/entrar?aviso=conta-excluida");
            router.refresh();
          }}
          type="button"
        >
          {busy
            ? "Excluindo…"
            : confirm
              ? "Confirmar exclusão"
              : "Excluir conta"}
        </button>
      </div>
    </div>
  );
}

function AccountBody() {
  const app = useApp();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="flex flex-col gap-6 px-7 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-acc font-bold text-base text-white">
            {app.initials}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 font-bold text-xl">Minha conta</h2>
            <span className="truncate text-mute text-sm">
              {app.user.email || "Sem e-mail cadastrado"}
            </span>
          </div>
        </div>
        <ModalClose />
      </div>
      <ProfileSection />
      <Divider />
      <PasswordSection />
      <Divider />
      <GoogleSection />
      <Divider />
      <DeleteSection />
      <Divider />
      <button
        className="self-start border-0 bg-transparent p-0 font-semibold text-mute text-sm hover:text-acc disabled:cursor-wait disabled:opacity-60"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          const { error } = await authClient.signOut();
          if (error) {
            setLeaving(false);
            return toast(authErrorMessage(error));
          }
          router.replace("/entrar");
          router.refresh();
        }}
        type="button"
      >
        {leaving ? "Saindo…" : "Sair da conta"}
      </button>
    </div>
  );
}

export function AccountModal() {
  const app = useApp();
  return (
    <Modal
      className="max-w-[520px]"
      guardChanges
      onOpenChange={app.setAccountOpen}
      open={app.accountOpen}
      title="Minha conta"
      veilClassName="z-[35] py-20"
    >
      {app.accountOpen ? <AccountBody /> : null}
    </Modal>
  );
}
