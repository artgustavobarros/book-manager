"use client";

import { toast } from "@/components/app/toast";
import { download } from "@/lib/client/download";
import { toBackup } from "@/lib/domain/backup";
import { exportCsv, exportFileName } from "@/lib/domain/csv";

import { useBooks } from "./use-books";

export const RESTORE_EVENT = "bodega:restore";

/** Exportar CSV, salvar backup JSON e pedir a restauração (tratada pelo RestoreHost). */
export function useBackup() {
  const books = useBooks();
  return {
    exportCsv: () => {
      download(
        exportFileName("csv"),
        new Blob([exportCsv(books)], { type: "text/csv;charset=utf-8" })
      );
      toast("Planilha CSV exportada");
    },
    exportJson: () => {
      download(
        exportFileName("json"),
        new Blob([JSON.stringify(toBackup(books), null, 2)], {
          type: "application/json",
        })
      );
    },
    pickRestore: () => window.dispatchEvent(new Event(RESTORE_EVENT)),
  };
}
