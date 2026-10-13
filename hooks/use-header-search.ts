"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useShelfState } from "@/hooks/use-shelf-state";

/**
 * Texto da busca do header. O campo mostra um rascunho local: fora da Estante,
 * a primeira tecla navega para /estante e as seguintes só mudam o rascunho, que
 * vai inteiro para ?q= (com replaceState) quando a Estante abre.
 */
export function useHeaderSearch() {
  const pathname = usePathname();
  const { state, setShelf, onShelf } = useShelfState();
  const [draft, setDraft] = useState(state.q);
  const [seenQ, setSeenQ] = useState(state.q);
  // Página de onde saiu a navegação para a Estante que ainda não terminou.
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  // `q` mudou por fora do campo (Limpar, sair da Estante, voltar no histórico).
  if (state.q !== seenQ) {
    setSeenQ(state.q);
    if (pendingFrom === null) {
      setDraft(state.q);
    }
  }

  useEffect(() => {
    if (pendingFrom === null) {
      return;
    }
    if (onShelf) {
      setPendingFrom(null);
      if (draft !== state.q) {
        setShelf({ q: draft });
      }
    } else if (pathname !== pendingFrom) {
      // Foi para outra página antes de a Estante abrir.
      setPendingFrom(null);
      setDraft(state.q);
    }
  }, [pendingFrom, onShelf, pathname, draft, state.q, setShelf]);

  const setQuery = useCallback(
    (q: string) => {
      setDraft(q);
      if (onShelf) {
        setShelf({ q });
      } else if (pendingFrom === null) {
        setPendingFrom(pathname);
        setShelf({ q });
      }
    },
    [onShelf, pendingFrom, pathname, setShelf]
  );

  const clear = useCallback(() => setQuery(""), [setQuery]);

  return { query: draft, setQuery, clear };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
