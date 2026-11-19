"use client";

import { Tabs } from "@base-ui/react/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ArrowLeft,
  Database,
  KeyRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/dialog";
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
import { PageMain } from "./app-shell";
import { Avatar } from "./avatar";
import { SheetExportSection } from "./sheet-export-section";
import { toast } from "./toast";

const input =
  "h-10 rounded-lg border border-line2 bg-card px-3 text-sm text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink aria-invalid:border-acc";
const label = "flex flex-col gap-2 text-xs font-medium text-mute";
const sectionTitle = "font-semibold text-base";

function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
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
  useUnsavedChanges(form.formState.isDirty);

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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      {firstError ? (
        <Msg>{firstError}</Msg>
      ) : msg ? (
        <Msg tone={msg.tone}>{msg.text}</Msg>
      ) : null}
      <div className="flex">
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
  useUnsavedChanges(form.formState.isDirty);

  if (!app.hasPassword) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className={sectionTitle}>Alterar senha</h3>
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
      <h3 className={sectionTitle}>Alterar senha</h3>
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
      <h3 className={sectionTitle}>Conta Google</h3>
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
                  callbackURL: "/configuracoes?secao=acesso",
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
      <p className="m-0 text-mute text-sm leading-[1.5]">
        Exporte seu acervo, restaure um backup ou atualize os livros a partir de
        uma planilha.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => app.setSyncOpen(true)} variant="neutral">
          Sincronizar planilha
        </Button>
        <Button onClick={backup.exportCsv} variant="neutral">
          Exportar Excel (CSV)
        </Button>
        <Button onClick={backup.exportJson} variant="neutral">
          Salvar backup
        </Button>
        <Button onClick={backup.pickRestore} variant="neutral">
          Restaurar backup
        </Button>
      </div>
    </section>
  );
}

function DeleteSection() {
  const app = useApp();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const submitOnce = useSingleFlight();
  const warning =
    "Apaga sua conta, seus livros, suas metas e configurações. Esta ação não pode ser desfeita.";

  function close() {
    if (!busy) {
      setOpen(false);
      setPassword("");
      setMsg("");
    }
  }

  async function deleteAccount() {
    setMsg("");
    setBusy(true);
    let result: Awaited<ReturnType<typeof authClient.deleteUser>>;
    try {
      result = await authClient.deleteUser(app.hasPassword ? { password } : {});
    } catch {
      setBusy(false);
      return setMsg(NETWORK_ERROR_MESSAGE);
    }

    const { error } = result;
    if (error) {
      setBusy(false);
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
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className={sectionTitle}>Excluir conta</h3>
        <p className="text-mute text-sm leading-normal">{warning}</p>
      </div>
      <Button onClick={() => setOpen(true)} ref={trigger} variant="danger">
        Excluir conta
      </Button>
      <Modal
        className="max-w-[460px]"
        description={warning}
        initialFocus={app.hasPassword ? "#delete-account-password" : undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
        onOpenChange={(next) => {
          if (!next) {
            close();
          }
        }}
        open={open}
        title="Excluir conta"
      >
        <form
          action={() => submitOnce(deleteAccount)}
          className="flex flex-col gap-4 p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold font-title text-xl">Excluir conta</h2>
            {busy ? null : <ModalClose />}
          </div>
          <p className="text-mute text-sm leading-normal">{warning}</p>
          {app.hasPassword ? (
            <div className={label}>
              <label htmlFor="delete-account-password">
                Confirme com sua senha
              </label>
              <PasswordInput
                aria-invalid={msg === "Senha incorreta."}
                autoComplete="current-password"
                className="h-10"
                disabled={busy}
                id="delete-account-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setMsg("");
                }}
                required
                value={password}
              />
            </div>
          ) : null}
          {msg ? (
            <p className="text-acc text-sm" role="alert">
              {msg}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={busy} onClick={close} variant="neutral">
              Cancelar
            </Button>
            <Button disabled={busy} type="submit">
              {busy ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SessionSection() {
  const app = useApp();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  // Sair apaga o armazenamento local, e com ele o que ainda não subiu. Quem
  // não tem nada pendente não merece atrito; quem tem merece saber.
  const pendentes = useIsMutating({ predicate: isPendingOfflineMutation });
  const [avisado, setAvisado] = useState(false);
  const vaiDescartar = pendentes > 0 && avisado;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className={sectionTitle}>Sessão</h3>
        <p className="text-mute text-sm leading-normal">
          {vaiDescartar
            ? "Você tem alterações que ainda não foram enviadas. Se sair agora, elas serão perdidas."
            : "Encerre a sessão neste dispositivo."}
        </p>
      </div>
      <Button
        disabled={leaving}
        onClick={async () => {
          // Primeiro clique com fila pendente só avisa; o segundo sai.
          if (pendentes > 0 && !avisado) {
            return setAvisado(true);
          }
          setLeaving(true);
          try {
            const { error } = await authClient.signOut();
            if (error) {
              setLeaving(false);
              return toast(authErrorMessage(error), { type: "error" });
            }
          } catch {
            setLeaving(false);
            return toast(NETWORK_ERROR_MESSAGE, { type: "error" });
          }
          // Sair tem de levar embora o que ficou no navegador: a fila
          // offline e o acervo em cache seguiam no IndexedDB após o logout.
          await clearOfflineData(app.user.id);
          router.replace("/entrar");
          router.refresh();
        }}
        variant="neutral"
      >
        {leaving
          ? "Saindo…"
          : vaiDescartar
            ? "Sair e descartar"
            : "Sair da conta"}
      </Button>
    </div>
  );
}

const sections = [
  {
    id: "perfil",
    title: "Perfil",
    description: "Nome e e-mail da sua conta.",
    icon: UserRound,
  },
  {
    id: "acesso",
    title: "Acesso",
    description: "Senha e vínculo com o Google.",
    icon: KeyRound,
  },
  {
    id: "dados",
    title: "Dados e backup",
    description: "Sincronização, arquivos e cópia semanal.",
    icon: Database,
  },
  {
    id: "conta",
    title: "Gerenciar conta",
    description: "Encerre a sessão ou exclua sua conta.",
    icon: ShieldCheck,
  },
] as const;

function showSheetExportResult() {
  const url = new URL(window.location.href);
  const outcome = url.searchParams.get("sheetExport");
  if (!outcome) {
    return;
  }
  url.searchParams.delete("sheetExport");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  toast(
    outcome === "ok"
      ? "Cópia semanal conectada"
      : outcome === "denied"
        ? "Conexão com Google cancelada"
        : "Confira a cópia semanal na sua conta"
  );
}

export function AccountSettings({
  initialSection,
}: {
  initialSection?: string;
}) {
  const app = useApp();
  const section =
    sections.find((item) => item.id === initialSection)?.id ?? "perfil";
  useEffect(showSheetExportResult, []);

  const panels = {
    perfil: <ProfileSection />,
    acesso: (
      <>
        <PasswordSection />
        <div className="border-line border-t pt-5">
          <GoogleSection />
        </div>
      </>
    ),
    dados: (
      <>
        <DataBackupSection />
        <div className="border-line border-t pt-5">
          <SheetExportSection />
        </div>
      </>
    ),
    conta: (
      <>
        <SessionSection />
        <div className="border-line border-t pt-5">
          <DeleteSection />
        </div>
      </>
    ),
  };

  return (
    <PageMain>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
        <div className="border-line border-b pb-2">
          <Button asChild size="none" variant="link">
            <Link className="min-h-11 text-sm" href="/">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar ao painel
            </Link>
          </Button>
        </div>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-bold font-title text-3xl">Configurações</h1>
            <p className="text-mute text-sm leading-normal">
              Gerencie seu perfil, seu acesso e os dados do acervo.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              className="size-10 font-semibold text-sm"
              image={app.user.image}
              initials={app.initials}
            />
            <div className="min-w-0">
              <p className="break-words font-semibold text-sm">
                {app.user.name}
              </p>
              <p className="break-all text-mute text-xs">{app.user.email}</p>
            </div>
          </div>
        </header>
        <Tabs.Root
          className="grid items-start gap-4 md:grid-cols-[224px_minmax(0,1fr)]"
          defaultValue={section}
          key={section}
          orientation="vertical"
        >
          <Tabs.List
            aria-label="Categorias de configurações"
            className="grid grid-cols-2 gap-1 rounded-xl bg-soft p-2 md:grid-cols-1"
          >
            {sections.map(({ id, title, icon: Icon }) => (
              <Tabs.Tab
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left font-semibold text-mute text-sm hover:bg-hov hover:text-ink data-active:bg-card data-active:text-acc"
                key={id}
                value={id}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {title}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <div className="min-w-0">
            {sections.map(({ id, title, description }) => (
              <Tabs.Panel
                className="flex flex-col gap-5 rounded-xl border border-line bg-card p-4 md:p-6"
                keepMounted={id === "perfil" || id === "acesso"}
                key={id}
                value={id}
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-semibold font-title text-xl">{title}</h2>
                  <p className="text-mute text-sm leading-normal">
                    {description}
                  </p>
                </div>
                {panels[id]}
              </Tabs.Panel>
            ))}
          </div>
        </Tabs.Root>
      </div>
    </PageMain>
  );
}
