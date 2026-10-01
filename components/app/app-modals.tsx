"use client";

import { BookModals } from "@/components/books/book-modals";

import { AccountModal } from "./account-modal";
import { SurpriseModal } from "./surprise-modal";
import { SyncModal } from "./sync-modal";

/** Modais globais (ficha, edição, empréstimo, surpresa, conta, planilha). */
export function AppModals() {
  return (
    <>
      <BookModals />
      <SurpriseModal />
      <SyncModal />
      <AccountModal />
    </>
  );
}
