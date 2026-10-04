"use client";

import { useBackup } from "@/hooks/use-backup";

import { useApp } from "./app-provider";

const linkClass =
  "border-0 bg-transparent p-0 text-xs font-semibold text-ink hover:text-acc";

export function AppFooter() {
  const app = useApp();
  const backup = useBackup();
  return (
    <footer className="border-line border-t">
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-4 px-7 py-4 text-mute text-xs">
        <span>
          Bodega Literária · os livros de casa, guardados na sua conta.
        </span>
        <div className="flex flex-wrap gap-5">
          <button
            className={linkClass}
            onClick={() => app.setSyncOpen(true)}
            type="button"
          >
            Sincronizar planilha
          </button>
          <button
            className={linkClass}
            onClick={backup.exportCsv}
            type="button"
          >
            Exportar Excel (CSV)
          </button>
          <button
            className={linkClass}
            onClick={backup.exportJson}
            type="button"
          >
            Salvar backup
          </button>
          <button
            className={linkClass}
            onClick={backup.pickRestore}
            type="button"
          >
            Restaurar backup
          </button>
        </div>
      </div>
    </footer>
  );
}
