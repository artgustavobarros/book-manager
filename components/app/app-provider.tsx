"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { BOOKS_KEY, useBookActions } from "@/hooks/use-books";
import { api } from "@/lib/client/api";
import { stat } from "@/lib/domain/status";
import type { Book, BookStatus } from "@/lib/domain/types";
import type { Theme } from "@/lib/theme";

import { toast } from "./toast";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface AppInitial {
  user: AppUser;
  books: Book[];
  goal: number;
  sheetUrl: string | null;
  year: number;
  tz: string;
  /** Instante do render no servidor (mantém data/saudação iguais na hidratação). */
  now: string;
  theme: Theme;
  googleEnabled: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
}

type ModalState = { kind: "view"; id: string } | { kind: "edit"; id: string | null } | null;

interface AppContextValue extends Omit<AppInitial, "books" | "goal"> {
  initials: string;
  goal: number;
  changeGoal: (delta: number) => void;
  setSheetUrl: (url: string | null) => void;
  setUser: (patch: Partial<AppUser>) => void;

  modal: ModalState;
  openView: (id: string) => void;
  openEdit: (id: string | null) => void;
  closeModal: () => void;
  surpriseOpen: boolean;
  setSurpriseOpen: (v: boolean) => void;
  accountOpen: boolean;
  setAccountOpen: (v: boolean) => void;
  syncOpen: boolean;
  setSyncOpen: (v: boolean) => void;
  lendFor: Book | null;
  closeLend: () => void;

  /** Muda o status (abre o pedido de "com quem?" para Emprestado). */
  setStatus: (book: Book, status: BookStatus) => void;
  confirmLend: (book: Book, borrower: string) => void;
  toggleFavorite: (book: Book) => void;
  toggleRead: (book: Book) => void;
  finish: (book: Book) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fora do AppProvider");
  return ctx;
}

export function initialsOf(name: string, email: string): string {
  return (name || email || "L")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function AppState({ initial, children }: { initial: AppInitial; children: React.ReactNode }) {
  const qc = useQueryClient();
  const actions = useBookActions();
  const [user, setUserState] = useState(initial.user);
  const [sheetUrl, setSheetUrl] = useState(initial.sheetUrl);
  const [modal, setModal] = useState<ModalState>(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [lendFor, setLendFor] = useState<Book | null>(null);

  const goalKey = ["goal", initial.year] as const;
  const { data: goal = initial.goal } = useQuery({
    queryKey: goalKey,
    queryFn: async () => (await api.get<{ target: number }>(`/api/goals/${initial.year}`)).target,
    initialData: initial.goal,
    staleTime: Infinity,
  });

  const changeGoal = useCallback(
    (delta: number) => {
      const next = Math.max(1, goal + delta);
      qc.setQueryData(goalKey, next);
      api.put(`/api/goals/${initial.year}`, { target: next }).catch((e: Error) => {
        qc.setQueryData(goalKey, goal);
        toast(e.message);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goal, qc, initial.year],
  );

  const setStatus = useCallback(
    (book: Book, k: BookStatus) => {
      if (k === "emprestado") return setLendFor(book);
      const patch: Partial<Book> = { status: k, borrower: null };
      if (k === "lido" && !book.yearRead) patch.yearRead = initial.year;
      actions.update(book.id, patch);
      toast(book.title + " → " + stat(k).label);
    },
    [actions, initial.year],
  );

  const value: AppContextValue = useMemo(
    () => ({
      ...initial,
      user,
      initials: initialsOf(user.name, user.email),
      goal,
      changeGoal,
      sheetUrl,
      setSheetUrl,
      setUser: (patch) => setUserState((u) => ({ ...u, ...patch })),
      modal,
      openView: (id) => setModal({ kind: "view", id }),
      openEdit: (id) => {
        setSurpriseOpen(false);
        setModal({ kind: "edit", id });
      },
      closeModal: () => setModal(null),
      surpriseOpen,
      setSurpriseOpen,
      accountOpen,
      setAccountOpen,
      syncOpen,
      setSyncOpen,
      lendFor,
      closeLend: () => setLendFor(null),
      setStatus,
      confirmLend: (book, borrower) => {
        setLendFor(null);
        actions.update(book.id, { status: "emprestado", borrower: borrower.trim() || null });
        toast(book.title + " → " + stat("emprestado").label);
      },
      toggleFavorite: (book) => {
        actions.update(book.id, { favorite: !book.favorite });
        toast(book.favorite ? "Removido dos favoritos" : "♥ Adicionado aos favoritos");
      },
      toggleRead: (book) => setStatus(book, book.status === "lido" ? "nao-lido" : "lido"),
      finish: (book) => {
        actions.update(book.id, { status: "lido", borrower: null, yearRead: book.yearRead || initial.year });
        toast("✓ " + book.title + " marcado como lido");
      },
    }),
    [initial, user, goal, changeGoal, sheetUrl, modal, surpriseOpen, accountOpen, syncOpen, lendFor, setStatus, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ initial, children }: { initial: AppInitial; children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });
    qc.setQueryData(BOOKS_KEY, initial.books);
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <AppState initial={initial}>{children}</AppState>
    </QueryClientProvider>
  );
}
