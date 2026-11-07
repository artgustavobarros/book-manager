"use client";

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  BOOKS_KEY,
  configureBookMutationDefaults,
  useBookActions,
} from "@/hooks/use-books";
import { api } from "@/lib/client/api";
import {
  createOfflinePersister,
  isPendingOfflineMutation,
  OFFLINE_MUTATION_META,
  offlineMutationRetry,
  offlineMutationRetryDelay,
} from "@/lib/client/offline-persistence";
import {
  nextReading,
  readingInfo,
  readingYearFor,
  situationInfo,
} from "@/lib/domain/book-state";
import type { ShareScope } from "@/lib/domain/share";
import type { ShelfView } from "@/lib/domain/shelf";
import { initialsOf } from "@/lib/domain/text";
import type { Book, Reading, Situation } from "@/lib/domain/types";
import { SHELF_VIEW_COOKIE, type Theme } from "@/lib/theme";

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
  /** Vista preferida da Estante ("grid" | "list"), lida do cookie no SSR. */
  shelfView?: ShelfView;
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
  clearRouteTransition: () => void;
  closeLend: () => void;
  closeModal: () => void;
  closeShare: () => void;
  confirmLend: (book: Book, borrower: string) => void;
  /** Ação rápida da Leitura: não lido → lendo → lido → não lido. */
  cycleReading: (book: Book) => void;
  finish: (book: Book) => void;
  goal: number;
  initials: string;
  lendFor: Book | null;

  modal: ModalState;
  openEdit: (id: string | null) => void;
  /** Abre o modal "Compartilhar" (escopo padrão: estante toda). */
  openShare: (scope?: ShareScope) => void;
  openView: (id: string) => void;
  /** Transição de rota em andamento (exibe o skeleton de destino imediatamente em 3G). */
  pendingNav: { from: string; to: string } | null;
  returnBook: (book: Book) => void;
  setAccountOpen: (v: boolean) => void;
  setPublicShelf: (state: PublicShelfState) => void;

  setReading: (book: Book, reading: Reading) => void;
  setSheetUrl: (url: string | null) => void;
  setShelfView: (view: ShelfView) => void;
  /** Muda a Situação (abre o pedido de "com quem?" para Emprestado). */
  setSituation: (book: Book, situation: Situation) => void;
  setSurpriseOpen: (v: boolean) => void;
  setSyncOpen: (v: boolean) => void;
  setUser: (patch: Partial<AppUser>) => void;
  /** Escopo inicial do modal "Compartilhar" aberto; null = fechado. */
  shareScope: ShareScope | null;
  shelfView: ShelfView;
  startReading: (book: Book) => void;
  startRouteTransition: (targetHref: string, currentPathname: string) => void;
  surpriseOpen: boolean;
  syncOpen: boolean;
  toggleFavorite: (book: Book) => void;
  toggleRead: (book: Book) => void;
  undoRead: (book: Book) => void;
}

export { initialsOf } from "@/lib/domain/text";

const GOAL_MUTATION_KEY = ["goal", "save"] as const;
const OFFLINE_CACHE_BUSTER = "offline-v1";

/**
 * Prazo do acervo guardado no navegador.
 *
 * Era infinito, e sair da conta agora limpa — mas fechar a aba não é sair.
 * Sem prazo, o acervo de quem só fechou o navegador ficava ali para sempre,
 * e num computador compartilhado isso é o mesmo problema que a limpeza do
 * logout resolveu. Sete dias folgam para a fila offline cumprir o papel dela
 * e são curtos o bastante para o dado não virar morador.
 */
const OFFLINE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type GoalVariables = { target: number; year: number };

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
  const [shelfView, setShelfViewState] = useState<ShelfView>(
    initial.shelfView ?? "grid"
  );
  const setShelfView = useCallback((view: ShelfView) => {
    setShelfViewState(view);
    // biome-ignore lint/suspicious/noDocumentCookie: Persists the user's preferred shelf view ("grid" | "list") for SSR and future visits.
    document.cookie = `${SHELF_VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  const [modal, setModal] = useState<ModalState>(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [lendFor, setLendFor] = useState<Book | null>(null);
  const [publicShelf, setPublicShelf] = useState(initial.publicShelf);
  const [shareScope, setShareScope] = useState<ShareScope | null>(null);
  const [pendingNav, setPendingNav] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const startRouteTransition = useCallback(
    (targetHref: string, currentPathname: string) => {
      const to = targetHref.split("?")[0] || "/";
      if (to === currentPathname) {
        setPendingNav(null);
        return;
      }
      setPendingNav({ from: currentPathname, to });
    },
    []
  );
  const clearRouteTransition = useCallback(() => setPendingNav(null), []);

  const goalKey = ["goal", initial.year] as const;
  const { data: goal = initial.goal } = useQuery({
    queryKey: goalKey,
    queryFn: async () =>
      (await api.get<{ target: number }>(`/api/goals/${initial.year}`)).target,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const saveGoal = useMutation({
    mutationKey: GOAL_MUTATION_KEY,
    scope: { id: `goal:${initial.year}` },
    mutationFn: ({ year, target }: GoalVariables) =>
      api.put(`/api/goals/${year}`, { target }),
  });

  const changeGoal = useCallback(
    (delta: number) => {
      const next = Math.max(
        1,
        (qc.getQueryData<number>(goalKey) ?? goal) + delta
      );
      qc.setQueryData(goalKey, next);
      saveGoal.mutate({ year: initial.year, target: next });
    },
    [goal, goalKey, initial.year, qc, saveGoal]
  );

  const setReading = useCallback(
    (book: Book, k: Reading) => {
      const patch: Partial<Book> = { reading: k };
      const yearRead = readingYearFor(book.yearRead, k, initial.year);
      if (yearRead !== book.yearRead) {
        patch.yearRead = yearRead;
      }
      void actions
        .update(book.id, patch)
        .then((ok) => ok && toast(book.title + " → " + readingInfo(k).label));
    },
    [actions, initial.year]
  );

  const cycleReading = useCallback(
    (book: Book) => {
      const next = nextReading(book.reading);
      const patch: Partial<Book> = { reading: next };
      const yearRead = readingYearFor(book.yearRead, next, initial.year);
      if (yearRead !== book.yearRead) {
        patch.yearRead = yearRead;
      }

      void actions.update(book.id, patch).then((ok) => {
        if (!ok) {
          return;
        }
        if (next === "lido") {
          toast(book.title + " marcado como lido");
        } else if (next === "nao-lido") {
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
      void actions
        .update(book.id, { reading: "nao-lido", yearRead: null })
        .then((ok) => ok && toast(book.title + " marcado como não lido"));
    },
    [actions]
  );

  const startReading = useCallback(
    (book: Book) => {
      void actions
        .update(book.id, { reading: "lendo" })
        .then((ok) => ok && toast("Boa leitura: " + book.title));
    },
    [actions]
  );

  /** Devolução: o livro volta a Em casa e a Leitura não muda. */
  const returnBook = useCallback(
    (book: Book) => {
      void actions
        .update(book.id, { situation: "em-casa" })
        .then((ok) => ok && toast(book.title + " devolvido"));
    },
    [actions]
  );

  const setSituation = useCallback(
    (book: Book, k: Situation) => {
      if (k === "emprestado") {
        return setLendFor(book);
      }
      if (k === "em-casa") {
        return returnBook(book);
      }
      void actions
        .update(book.id, { situation: k })
        .then((ok) => ok && toast(book.title + " → " + situationInfo(k).label));
    },
    [actions, returnBook]
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
      shelfView,
      setShelfView,
      pendingNav,
      startRouteTransition,
      clearRouteTransition,
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
      setReading,
      setSituation,
      returnBook,
      confirmLend: (book, borrower) => {
        setLendFor(null);
        void actions
          .update(book.id, {
            situation: "emprestado",
            borrower: borrower.trim() || null,
          })
          .then(
            (ok) =>
              ok &&
              toast(book.title + " → " + situationInfo("emprestado").label)
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
        setReading(book, book.reading === "lido" ? "nao-lido" : "lido"),
      cycleReading,
      undoRead,
      startReading,
      finish: (book) => {
        void actions
          .update(book.id, {
            reading: "lido",
            yearRead: readingYearFor(book.yearRead, "lido", initial.year),
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
      shelfView,
      setShelfView,
      pendingNav,
      startRouteTransition,
      clearRouteTransition,
      publicShelf,
      shareScope,
      modal,
      surpriseOpen,
      accountOpen,
      syncOpen,
      lendFor,
      setReading,
      setSituation,
      returnBook,
      cycleReading,
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
      defaultOptions: {
        mutations: { gcTime: Number.POSITIVE_INFINITY },
        queries: {
          gcTime: Number.POSITIVE_INFINITY,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
    configureBookMutationDefaults(qc);
    qc.setQueryData(BOOKS_KEY, initial.books, { updatedAt: 0 });
    qc.setQueryData(["goal", initial.year], initial.goal, { updatedAt: 0 });
    qc.setMutationDefaults<unknown, Error, GoalVariables>(GOAL_MUTATION_KEY, {
      mutationFn: ({ year, target }) =>
        api.put(`/api/goals/${year}`, { target }),
      meta: OFFLINE_MUTATION_META,
      networkMode: "online",
      retry: offlineMutationRetry,
      retryDelay: offlineMutationRetryDelay,
      onError: (error, { year }) => {
        void qc.invalidateQueries({ queryKey: ["goal", year] });
        toast(error.message || "Não foi possível salvar. Tente de novo.", {
          type: "error",
        });
      },
    });
    return qc;
  });
  const [persister] = useState(() => createOfflinePersister(initial.user.id));
  return (
    <PersistQueryClientProvider
      client={client}
      onSuccess={() => {
        if (!client.getQueryData(BOOKS_KEY)) {
          client.setQueryData(BOOKS_KEY, initial.books);
        }
        if (!client.getQueryData(["goal", initial.year])) {
          client.setQueryData(["goal", initial.year], initial.goal);
        }
        void client.resumePausedMutations();
      }}
      persistOptions={{
        buster: OFFLINE_CACHE_BUSTER,
        maxAge: OFFLINE_CACHE_MAX_AGE_MS,
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.dataUpdatedAt > 0 &&
            (query.queryKey[0] === "books" || query.queryKey[0] === "goal"),
          shouldDehydrateMutation: isPendingOfflineMutation,
        },
      }}
    >
      <AppState initial={initial}>{children}</AppState>
    </PersistQueryClientProvider>
  );
}
