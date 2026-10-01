"use client";

import { useState } from "react";

import { Modal, ModalClose } from "@/components/ui/dialog";
import { useBookActions } from "@/hooks/use-books";
import { ApiError, api } from "@/lib/client/api";

import { useApp } from "./app-provider";
import { toast } from "./toast";

function SyncBody() {
  const app = useApp();
  const { refetch } = useBookActions();
  const [url, setUrl] = useState(app.sheetUrl ?? "");
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setSyncing(true);
    setMsg("");
    try {
      const res = await api.post<{ message: string }>("/api/sheet-sync", { sheetUrl: url.trim() || undefined });
      app.setSheetUrl(url.trim() || null);
      await refetch();
      setMsg(res.message);
      toast("Planilha sincronizada");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Não foi possível sincronizar agora.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-bold">Sincronizar planilha</h2>
        <ModalClose />
      </div>
      <span className="text-sm leading-[1.55] text-mute">
        Cole o link da planilha do Google Sheets (compartilhada como “Qualquer pessoa com o link pode ver”). Livros novos são
        adicionados e os existentes atualizados; anotações, capas, páginas e anos de leitura registrados aqui são preservados.
      </span>
      <input
        aria-label="Link da planilha"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        className="h-10 rounded-lg border border-line2 bg-card px-3 text-sm text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink"
      />
      {msg ? <span className="text-sm leading-[1.5] text-ink">{msg}</span> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => app.setSyncOpen(false)}
          className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
        >
          Fechar
        </button>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void run()}
          className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc"
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
    <Modal open={app.syncOpen} onOpenChange={app.setSyncOpen} title="Sincronizar planilha" className="max-w-[560px]" veilClassName="z-[35] py-20">
      {app.syncOpen ? <SyncBody /> : null}
    </Modal>
  );
}
