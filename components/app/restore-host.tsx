"use client";

import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { RESTORE_EVENT } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { api } from "@/lib/client/api";
import { fromBackup } from "@/lib/domain/backup";
import type { Book } from "@/lib/domain/types";

import { toast } from "./toast";

const INVALID_BACKUP =
  "O arquivo escolhido não é um backup válido da Bodega Literária.";

/**
 * "Restaurar backup": seletor de arquivo + confirmação quando o acervo não está vazio
 * (a restauração substitui tudo). Erros aparecem como toast, nunca `alert`.
 */
export function RestoreHost() {
  const input = useRef<HTMLInputElement>(null);
  const books = useBooks();
  const { replaceAll } = useBookActions();
  const [pending, setPending] = useState<{
    data: unknown[];
    valid: number;
  } | null>(null);

  useEffect(() => {
    const open = () => input.current?.click();
    window.addEventListener(RESTORE_EVENT, open);
    return () => window.removeEventListener(RESTORE_EVENT, open);
  }, []);

  async function restore(data: unknown[]) {
    try {
      const res = await api.post<{ count: number; books: Book[] }>(
        "/api/books/import",
        data
      );
      replaceAll(res.books);
      toast("Backup restaurado · " + res.count + " livros");
    } catch (e) {
      toast("Não foi possível restaurar o backup", {
        type: "error",
        note: (e as Error).message || INVALID_BACKUP,
      });
    }
  }

  return (
    <>
      <input
        accept=".json,application/json"
        aria-hidden="true"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) {
            return;
          }
          let data: unknown;
          try {
            data = JSON.parse(await file.text());
          } catch {
            data = null;
          }
          const valid = countValidBooks(data);
          if (!(Array.isArray(data) && valid)) {
            return toast("Não foi possível restaurar o backup", {
              type: "error",
              note: INVALID_BACKUP,
            });
          }
          if (books.length) {
            setPending({ data, valid });
          } else {
            void restore(data);
          }
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <ConfirmDialog
        confirmLabel="Restaurar backup"
        description={`O backup tem ${pending?.valid ?? 0} livros${ignoredNote(pending)} e vai substituir os ${books.length} livros atuais. Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          const { data } = pending!;
          setPending(null);
          void restore(data);
        }}
        onOpenChange={(o) => !o && setPending(null)}
        open={!!pending}
        title="Substituir o acervo?"
      />
    </>
  );
}

/** Livros que o servidor vai aceitar (mesma regra de `fromBackup`); 0 se inválido. */
function countValidBooks(data: unknown): number {
  try {
    return fromBackup(data).length;
  } catch {
    return 0;
  }
}

/** " (N itens ignorados)" quando parte do arquivo não tem título. */
function ignoredNote(pending: { data: unknown[]; valid: number } | null) {
  const ignored = pending ? pending.data.length - pending.valid : 0;
  if (!ignored) {
    return "";
  }
  return ignored === 1 ? " (1 item ignorado)" : ` (${ignored} itens ignorados)`;
}
