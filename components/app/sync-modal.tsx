"use client";

import { useState } from "react";

import {
  Modal,
  ModalClose,
  useModalClose,
  useModalDraft,
} from "@/components/ui/dialog";
import { useBookActions } from "@/hooks/use-books";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { ApiError, api } from "@/lib/client/api";

import { useApp } from "./app-provider";
import { toast } from "./toast";

function SyncBody() {
  const app = useApp();
  const { refetch } = useBookActions();
  const [url, setUrl] = useState(app.sheetUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(app.sheetUrl ?? "");
  const requestClose = useModalClose();
  useModalDraft(url !== savedUrl);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const submitOnce = useSingleFlight();

  async function run() {
    setSyncing(true);
    setMsg("");
    try {
      const res = await api.post<{ message: string }>("/api/sheet-sync", {
        sheetUrl: url.trim() || undefined,
      });
      app.setSheetUrl(url.trim() || null);
      setSavedUrl(url);
      await refetch();
      setMsg(res.message);
      toast("Planilha sincronizada");
    } catch (e) {
      setMsg(
        e instanceof ApiError
          ? e.message
          : "Não foi possível sincronizar agora."
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 font-bold text-xl">Sincronizar planilha</h2>
        <ModalClose />
      </div>
      <span className="text-mute text-sm leading-[1.55]">
        Cole o link da planilha do Google Sheets (compartilhada como “Qualquer
        pessoa com o link pode ver”). Livros novos são adicionados e os
        existentes atualizados; anotações, capas, páginas e anos de leitura
        registrados aqui são preservados.
      </span>
      <input
        aria-label="Link da planilha"
        className="h-10 rounded-lg border border-line2 bg-card px-3 text-ink text-sm outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink"
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={url}
      />
      {msg ? (
        <span className="text-ink text-sm leading-[1.5]">{msg}</span>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
          onClick={requestClose}
          type="button"
        >
          Fechar
        </button>
        <button
          className="h-10 rounded-lg border-0 bg-ink px-5 font-semibold text-card text-sm hover:bg-acc"
          disabled={syncing}
          onClick={() => void submitOnce(run)}
          type="button"
        >
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </button>
      </div>
    </div>
  );
}

export function SyncModal() {
  const app = useApp();
  return (
    <Modal
      className="max-w-[560px]"
      guardChanges
      onOpenChange={app.setSyncOpen}
      open={app.syncOpen}
      title="Sincronizar planilha"
      veilClassName="z-[35] py-20"
    >
      {app.syncOpen ? <SyncBody /> : null}
    </Modal>
  );
}
