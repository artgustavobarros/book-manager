"use client";

import { useBackup } from "@/hooks/use-backup";

import { useApp } from "./app-provider";

const linkClass = "border-0 bg-transparent p-0 text-xs font-semibold text-ink hover:text-acc";

export function AppFooter() {
  const app = useApp();
  const backup = useBackup();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-4 px-7 py-4 text-xs text-mute">
        <span>Bodega Literária · os livros de casa, guardados na sua conta.</span>
        <div className="flex flex-wrap gap-5">
          <button type="button" className={linkClass} onClick={() => app.setSyncOpen(true)}>
            Sincronizar planilha
          </button>
          <button type="button" className={linkClass} onClick={backup.exportCsv}>
            Exportar Excel (CSV)
          </button>
          <button type="button" className={linkClass} onClick={backup.exportJson}>
            Salvar backup
          </button>
          <button type="button" className={linkClass} onClick={backup.pickRestore}>
            Restaurar backup
          </button>
        </div>
      </div>
    </footer>
  );
}
