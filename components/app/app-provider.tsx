"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { BOOKS_KEY, useBookActions } from "@/hooks/use-books";
import { api } from "@/lib/client/api";
import { createLatestSaver } from "@/lib/client/latest-saver";
import type { ShareScope } from "@/lib/domain/share";
import {
  nextReadingStatus,
  readingYearForStatus,
  returnStatus,
  stat,
} from "@/lib/domain/status";
import { initialsOf } from "@/lib/domain/text";
import type { Book, BookStatus } from "@/lib/domain/types";
import type { Theme } from "@/lib/theme";

import { toast } from "./toast";

export interface AppUser {
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
}

export interface AppInitial {
  books: Book[];
  goal: number;
  googleEnabled: boolean;
  googleLinked: boolean;
  hasPassword: boolean;
  /** Instante do render no servidor (mantém data/saudação iguais na hidratação). */
  now: string;
  /** URL pública do app (links compartilhados são absolutos). */
  origin: string;
  publicShelf: PublicShelfState;
  sheetUrl: string | null;
  theme: Theme;
  tz: string;
  user: AppUser;
  year: number;
}

export interface PublicShelfState {
  enabled: boolean;
  slug: string | null;
}

type ModalState =
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string | null }
  | null;

interface AppContextValue extends Omit<AppInitial, "books" | "goal"> {
  accountOpen: boolean;
  changeGoal: (delta: number) => void;
  closeLend: () => void;
  closeModal: () => void;
  closeShare: () => void;
  confirmLend: (book: Book, borrower: string) => void;
  cycleStatus: (book: Book) => void;
  finish: (book: Book) => void;
  goal: number;
  initials: string;
  lendFor: Book | null;

  modal: ModalState;
  openEdit: (id: string | null) => void;
  /** Abre o modal "Compartilhar" (escopo padrão: estante toda). */
  openShare: (scope?: ShareScope) => void;
  openView: (id: string) => void;
  returnBook: (book: Book) => void;
  setAccountOpen: (v: boolean) => void;
  setPublicShelf: (state: PublicShelfState) => void;
  setSheetUrl: (url: string | null) => void;

  /** Muda o status (abre o pedido de "com quem?" para Emprestado). */
  setStatus: (book: Book, status: BookStatus) => void;
  setSurpriseOpen: (v: boolean) => void;
  setSyncOpen: (v: boolean) => void;
  setUser: (patch: Partial<AppUser>) => void;
  /** Escopo inicial do modal "Compartilhar" aberto; null = fechado. */
  shareScope: ShareScope | null;
  startReading: (book: Book) => void;
  surpriseOpen: boolean;
  syncOpen: boolean;
  toggleFavorite: (book: Book) => void;
  toggleRead: (book: Book) => void;
  undoRead: (book: Book) => void;
}

export { initialsOf } from "@/lib/domain/text";

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp fora do AppProvider");
  }
  return ctx;
}

function AppState({
  initial,
  children,
}: {
  initial: AppInitial;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const actions = useBookActions();
  const [user, setUserState] = useState(initial.user);
  const setUser = useCallback(
    (patch: Partial<AppUser>) => setUserState((u) => ({ ...u, ...patch })),
    []
  );
  const [sheetUrl, setSheetUrl] = useState(initial.sheetUrl);
  const [modal, setModal] = useState<ModalState>(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [lendFor, setLendFor] = useState<Book | null>(null);
  const [publicShelf, setPublicShelf] = useState(initial.publicShelf);
  const [shareScope, setShareScope] = useState<ShareScope | null>(null);

  const goalKey = ["goal", initial.year] as const;
  const { data: goal = initial.goal } = useQuery({
    queryKey: goalKey,
    queryFn: async () =>
      (await api.get<{ target: number }>(`/api/goals/${initial.year}`)).target,
    initialData: initial.goal,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // PUTs da meta em fila: o último valor clicado é o último a chegar ao servidor.
  const [saveGoal] = useState(() =>
    createLatestSaver(
      (target: number) => api.put(`/api/goals/${initial.year}`, { target }),
      {
        initial: initial.goal,
        onFail: (lastSaved, e) => {
          qc.setQueryData(["goal", initial.year], lastSaved);
          toast(e.message, { type: "error" });
        },
      }
    )
  );
  const changeGoal = useCallback(
    (delta: number) => {
      const next = Math.max(1, goal + delta);
      qc.setQueryData(["goal", initial.year], next);
      void saveGoal(next);
    },
    [goal, initial.year, qc, saveGoal]
  );

  const setStatus = useCallback(
    (book: Book, k: BookStatus) => {
      if (k === "emprestado") {
        return setLendFor(book);
      }
      const patch: Partial<Book> = { status: k, borrower: null };
      const yearRead = readingYearForStatus(book.yearRead, k, initial.year);
      if (yearRead !== book.yearRead) {
        patch.yearRead = yearRead;
      }
      void actions
        .update(book.id, patch)
        .then((ok) => ok && toast(book.title + " → " + stat(k).label));
    },
    [actions, initial.year]
  );

  const cycleStatus = useCallback(
    (book: Book) => {
      const nextStatus = nextReadingStatus(book.status);
      const patch: Partial<Book> = { status: nextStatus };
      const yearRead = readingYearForStatus(
        book.yearRead,
        nextStatus,
        initial.year
      );
      if (yearRead !== book.yearRead) {
        patch.yearRead = yearRead;
      }
      if (nextStatus === "nao-lido") {
        patch.borrower = null;
      }

      void actions.update(book.id, patch).then((ok) => {
        if (!ok) {
          return;
        }
        if (nextStatus === "lido") {
          toast(book.title + " marcado como lido");
        } else if (nextStatus === "nao-lido") {
          toast(book.title + " marcado como não lido");
        } else {
          toast("Boa leitura: " + book.title);
        }
      });
    },
    [actions, initial.year]
  );

  const undoRead = useCallback(
    (book: Book) => {
      // Emprestado continua emprestado: só sai da contagem de lidos.
      const patch: Partial<Book> =
        book.status === "emprestado"
          ? { yearRead: null }
          : { status: "nao-lido", yearRead: null };
      void actions
        .update(book.id, patch)
        .then((ok) => ok && toast(book.title + " marcado como não lido"));
    },
    [actions]
  );

  const startReading = useCallback(
    (book: Book) => {
      void actions
        .update(book.id, {
          status: "lendo",
        })
        .then((ok) => ok && toast("Boa leitura: " + book.title));
    },
    [actions]
  );

  /** Devolução: volta a "lido" se o livro tem ano de leitura e nunca apaga esse ano. */
  const returnBook = useCallback(
    (book: Book) => {
      const status = returnStatus(book);
      void actions.update(book.id, { status, borrower: null }).then((ok) => {
        if (!ok) {
          return;
        }
        toast(book.title + " devolvido (" + stat(status).label + ")");
      });
    },
    [actions]
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
      publicShelf,
      setPublicShelf,
      shareScope,
      openShare: (scope) => {
        setModal(null);
        setShareScope(scope ?? { kind: "todos" });
      },
      closeShare: () => setShareScope(null),
      setUser,
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
      returnBook,
      confirmLend: (book, borrower) => {
        setLendFor(null);
        void actions
          .update(book.id, {
            status: "emprestado",
            borrower: borrower.trim() || null,
          })
          .then(
            (ok) => ok && toast(book.title + " → " + stat("emprestado").label)
          );
      },
      toggleFavorite: (book) => {
        void actions
          .update(book.id, { favorite: !book.favorite })
          .then(
            (ok) =>
              ok &&
              toast(
                book.favorite
                  ? "Removido dos favoritos"
                  : "Adicionado aos favoritos"
              )
          );
      },
      toggleRead: (book) =>
        setStatus(book, book.status === "lido" ? "nao-lido" : "lido"),
      cycleStatus,
      undoRead,
      startReading,
      finish: (book) => {
        void actions
          .update(book.id, {
            status: "lido",
            borrower: null,
            yearRead: readingYearForStatus(book.yearRead, "lido", initial.year),
          })
          .then((ok) => ok && toast(book.title + " marcado como lido"));
      },
    }),
    [
      initial,
      user,
      setUser,
      goal,
      changeGoal,
      sheetUrl,
      publicShelf,
      shareScope,
      modal,
      surpriseOpen,
      accountOpen,
      syncOpen,
      lendFor,
      setStatus,
      returnBook,
      cycleStatus,
      undoRead,
      startReading,
      actions,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({
  initial,
  children,
}: {
  initial: AppInitial;
  children: React.ReactNode;
}) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
    });
    qc.setQueryData(BOOKS_KEY, initial.books);
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <AppState initial={initial}>{children}</AppState>
    </QueryClientProvider>
  );
}
