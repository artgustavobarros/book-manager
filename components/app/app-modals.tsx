"use client";

import { BookModals } from "@/components/books/book-modals";
import { ShareDialog } from "@/components/share/share-dialog";

import { SurpriseModal } from "./surprise-modal";
import { SyncModal } from "./sync-modal";

/** Modais globais (ficha, edição, empréstimo, surpresa, planilha, compartilhar). */
export function AppModals() {
  return (
    <>
      <BookModals />
      <SurpriseModal />
      <SyncModal />
      <ShareDialog />
    </>
  );
}
