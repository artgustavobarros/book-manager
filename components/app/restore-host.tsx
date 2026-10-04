"use client";

import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { RESTORE_EVENT } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { api } from "@/lib/client/api";
import type { Book } from "@/lib/domain/types";

import { toast } from "./toast";

/**
 * "Restaurar backup": seletor de arquivo + confirmação quando o acervo não está vazio
 * (a restauração substitui tudo). Erros aparecem como toast, nunca `alert`.
 */
export function RestoreHost() {
  const input = useRef<HTMLInputElement>(null);
  const books = useBooks();
  const { replaceAll } = useBookActions();
  const [pending, setPending] = useState<unknown[] | null>(null);

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
      toast((e as Error).message || "Arquivo inválido.");
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
          if (!Array.isArray(data)) {
            return toast("Arquivo inválido.");
          }
          if (books.length) {
            setPending(data);
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
        description={`O backup tem ${pending?.length ?? 0} itens e vai substituir os ${books.length} livros atuais. Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          const data = pending!;
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
