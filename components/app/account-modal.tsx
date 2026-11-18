"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating } from "@tanstack/react-query";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal, ModalClose, useModalDraft } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { useBackup } from "@/hooks/use-backup";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, NETWORK_ERROR_MESSAGE } from "@/lib/auth-errors";
import {
  clearOfflineData,
  isPendingOfflineMutation,
} from "@/lib/client/offline-persistence";
import {
  changePasswordSchema,
  MIN_PASSWORD,
  profileSchema,
} from "@/lib/validation/auth";

import { useApp } from "./app-provider";
import { Avatar } from "./avatar";
import { SheetExportSection } from "./sheet-export-section";
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
          className="h-10 rounded-lg border-0 bg-acc px-5 font-semibold text-onacc text-sm hover:bg-acc2"
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
      <div className={label}>
        <label htmlFor="account-current-password">Senha atual</label>
        <PasswordInput
          {...form.register("current")}
          aria-invalid={!!e.current}
          autoComplete="current-password"
          className="h-10"
          id="account-current-password"
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <div className={label}>
          <label htmlFor="account-new-password">Nova senha</label>
          <PasswordInput
            {...form.register("password")}
            aria-invalid={!!e.password}
            autoComplete="new-password"
            className="h-10"
            id="account-new-password"
            placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
          />
        </div>
        <div className={label}>
          <label htmlFor="account-confirm-password">Confirmar nova senha</label>
          <PasswordInput
            {...form.register("confirm")}
            aria-invalid={!!e.confirm}
            autoComplete="new-password"
            className="h-10"
            id="account-confirm-password"
          />
        </div>
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
                try {
                  const { data: accounts } = await authClient.listAccounts();
                  const google = accounts?.find(
                    (a) => a.providerId === "google"
                  );
                  if (!google) {
                    return setLinked(false);
                  }
                  // `id` é a linha do Better Auth; `accountId` é o `sub` do
                  // Google. O endpoint casa pelo `id`.
                  const { error } = await authClient.unlinkAccount({
                    accountId: google.id,
                  });
                  if (error) {
                    return setMsg(authErrorMessage(error));
                  }
                  setLinked(false);
                  toast("Conta Google desvinculada");
                } catch {
                  setMsg(NETWORK_ERROR_MESSAGE);
                } finally {
                  setBusy(false);
                }
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
              // Em caso de sucesso o navegador sai para o Google: o botão só volta em
              // erro da API ou de rede.
              try {
                const { error } = await authClient.linkSocial({
                  provider: "google",
                  callbackURL: "/",
                });
                if (error) {
                  setBusy(false);
                  setMsg(authErrorMessage(error));
                }
              } catch {
                setBusy(false);
                setMsg(NETWORK_ERROR_MESSAGE);
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

function DataBackupSection() {
  const app = useApp();
  const backup = useBackup();

  return (
    <section aria-label="Dados e backup" className="flex flex-col gap-3">
      <span className={sectionTitle}>Dados e backup</span>
      <p className="m-0 text-mute text-sm leading-[1.5]">
        Exporte seu acervo, restaure um backup ou atualize os livros a partir de
        uma planilha.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            app.setAccountOpen(false);
            app.setSyncOpen(true);
          }}
          variant="neutral"
        >
          Sincronizar planilha
        </Button>
        <Button onClick={backup.exportCsv} variant="neutral">
          Exportar Excel (CSV)
        </Button>
        <Button onClick={backup.exportJson} variant="neutral">
          Salvar backup
        </Button>
        <Button
          onClick={() => {
            app.setAccountOpen(false);
            backup.pickRestore();
          }}
          variant="neutral"
        >
          Restaurar backup
        </Button>
      </div>
    </section>
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
        <div className={label}>
          <label htmlFor="delete-account-password">
            Confirme com sua senha
          </label>
          <PasswordInput
            autoComplete="current-password"
            className="h-10"
            id="delete-account-password"
            name="delete-account-password"
            onChange={(e) => {
              setPassword(e.target.value);
              setMsg("");
            }}
            value={password}
          />
        </div>
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
            let result: Awaited<ReturnType<typeof authClient.deleteUser>>;
            try {
              result = await authClient.deleteUser(
                app.hasPassword ? { password } : {}
              );
            } catch {
              setConfirm(false);
              return setMsg(NETWORK_ERROR_MESSAGE);
            } finally {
              setBusy(false);
            }
            const { error } = result;
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
            // A conta deixou de existir: o acervo em cache não pode ficar.
            await clearOfflineData(app.user.id);
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
  // Sair apaga o armazenamento local, e com ele o que ainda não subiu. Quem
  // não tem nada pendente não merece atrito; quem tem merece saber.
  const pendentes = useIsMutating({ predicate: isPendingOfflineMutation });
  const [avisado, setAvisado] = useState(false);
  const vaiDescartar = pendentes > 0 && avisado;
  return (
    <div className="flex flex-col gap-6 px-7 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            className="size-11 font-bold text-base"
            image={app.user.image}
            initials={app.initials}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 font-bold font-title text-xl">Minha conta</h2>
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
      <DataBackupSection />
      <Divider />
      <SheetExportSection />
      <Divider />
      <DeleteSection />
      <Divider />
      <div className="flex flex-col gap-2">
        {vaiDescartar ? (
          <span className="text-mute text-sm leading-[1.5]">
            Você tem alterações que ainda não foram enviadas. Se sair agora,
            elas serão perdidas.
          </span>
        ) : null}
        <button
          className="self-start border-0 bg-transparent p-0 font-semibold text-mute text-sm hover:text-acc disabled:cursor-wait disabled:opacity-60"
          disabled={leaving}
          onClick={async () => {
            // Primeiro clique com fila pendente só avisa; o segundo sai.
            if (pendentes > 0 && !avisado) {
              return setAvisado(true);
            }
            setLeaving(true);
            const { error } = await authClient.signOut();
            if (error) {
              setLeaving(false);
              return toast(authErrorMessage(error), { type: "error" });
            }
            // Sair tem de levar embora o que ficou no navegador: a fila
            // offline e o acervo em cache seguiam no IndexedDB após o logout.
            await clearOfflineData(app.user.id);
            router.replace("/entrar");
            router.refresh();
          }}
          type="button"
        >
          {leaving
            ? "Saindo…"
            : vaiDescartar
              ? "Sair e descartar"
              : "Sair da conta"}
        </button>
      </div>
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
