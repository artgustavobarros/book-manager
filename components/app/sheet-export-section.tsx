"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/client/api";
import {
  DRIVE_FILE_SCOPE,
  type SheetExportState,
} from "@/lib/services/sheet-export-contract";

import { useApp } from "./app-provider";

const QUERY_KEY = ["sheet-export"] as const;
const buttonClass =
  "h-9 rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm hover:border-ink disabled:cursor-wait disabled:opacity-60";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string) {
  return dateFormat.format(new Date(value));
}

export function SheetExportSection() {
  const app = useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data: state, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<SheetExportState>("/api/sheets-export"),
  });

  async function action(name: "retry" | "disable") {
    setBusy(true);
    setMessage("");
    try {
      const next = await api.post<SheetExportState>("/api/sheets-export", {
        action: name,
      });
      queryClient.setQueryData(QUERY_KEY, next);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      await api.post("/api/sheets-export", { action: "connect" });
      const { error: authError } = await authClient.linkSocial({
        provider: "google",
        scopes: [DRIVE_FILE_SCOPE],
        callbackURL: "/api/sheets-export/callback",
        errorCallbackURL: "/api/sheets-export/callback?error=denied",
        additionalParams: {
          access_type: "offline",
          prompt: "select_account consent",
        },
      });
      if (authError) {
        await api.post("/api/sheets-export", { action: "disable" });
        setMessage(authError.message ?? "Não foi possível conectar ao Google.");
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const active = state?.status === "enabled";
  const needsReconnect = state?.status === "reconnect";
  const canConnect = !active && app.googleEnabled;

  return (
    <section
      aria-label="Cópia semanal no Google Sheets"
      className="flex flex-col gap-3"
    >
      <span className="font-bold text-mute text-xs uppercase tracking-[.1em]">
        Cópia semanal no Google Sheets
      </span>
      <p className="m-0 text-mute text-sm leading-[1.5]">
        Guarde uma cópia dos seus livros a cada semana em uma planilha privada
        da sua conta Google. Cada semana fica em uma aba própria.
      </p>
      {error ? (
        <span className="text-acc text-sm">
          Não foi possível carregar o estado.
        </span>
      ) : null}
      {state?.status === "pending" ? (
        <span className="text-mute text-sm">
          Aguardando autorização do Google.
        </span>
      ) : null}
      {active ? (
        <span className="text-ink text-sm">Cópia automática ativa.</span>
      ) : null}
      {needsReconnect ? (
        <span className="text-acc text-sm">Reconecte sua conta Google.</span>
      ) : null}
      {state?.lastSucceededAt ? (
        <span className="text-mute text-sm">
          Última cópia: {formatDate(state.lastSucceededAt)}
        </span>
      ) : null}
      {state?.lastError ? (
        <span className="text-acc text-sm">{state.lastError}</span>
      ) : null}
      {message ? (
        <span aria-live="polite" className="text-acc text-sm">
          {message}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canConnect ? (
          <button
            className={buttonClass}
            disabled={busy}
            onClick={connect}
            type="button"
          >
            {busy
              ? "Conectando…"
              : needsReconnect
                ? "Reconectar"
                : "Conectar Google"}
          </button>
        ) : null}
        {state?.spreadsheetUrl ? (
          <a
            className={`${buttonClass} inline-flex items-center`}
            href={state.spreadsheetUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir planilha
          </a>
        ) : null}
        {active && state.lastError && !state.currentWeekSucceeded ? (
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() => action("retry")}
            type="button"
          >
            Tentar novamente
          </button>
        ) : null}
        {active || needsReconnect || state?.status === "pending" ? (
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() => action("disable")}
            type="button"
          >
            Desativar
          </button>
        ) : null}
      </div>
      {app.googleEnabled ? null : (
        <span className="text-mute text-xs">
          A conexão com Google não está disponível neste ambiente.
        </span>
      )}
      {state?.status === "disabled" ? (
        <span className="text-mute text-xs">
          As cópias anteriores continuam na sua conta Google.
        </span>
      ) : null}
    </section>
  );
}
