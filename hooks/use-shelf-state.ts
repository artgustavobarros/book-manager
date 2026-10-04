"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  parseShelfParams,
  type ShelfState,
  shelfHref,
  toShelfParams,
} from "@/lib/domain/shelf";

/**
 * Estado da Estante na URL (?q, status, faceta, ordem, vista). Na própria Estante,
 * atualiza com history.replaceState (sincronizado com useSearchParams, sem ida ao
 * servidor); de outras páginas, navega para /estante.
 */
export function useShelfState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const onShelf = pathname === "/estante";
  const state = useMemo(
    () => parseShelfParams(onShelf ? params : new URLSearchParams()),
    [params, onShelf]
  );

  const setShelf = useCallback(
    (
      patch: Partial<ShelfState>,
      { reset = false }: { reset?: boolean } = {}
    ) => {
      const next = reset
        ? { ...patch }
        : {
            ...state,
            ...patch,
            page: patch.page ?? ("view" in patch ? state.page : 1),
          };
      if (onShelf) {
        const qs = toShelfParams(next).toString();
        window.history["page" in patch ? "pushState" : "replaceState"](
          null,
          "",
          qs ? `/estante?${qs}` : "/estante"
        );
      } else {
        router.push(shelfHref(next));
        window.scrollTo({ top: 0 });
      }
    },
    [state, onShelf, router]
  );

  /** Vai para a Estante com um filtro novo (atalhos de Painel/Dados/autor). */
  const goShelf = useCallback(
    (patch: Partial<ShelfState> = {}) => {
      router.push(shelfHref(patch));
      window.scrollTo({ top: 0 });
    },
    [router]
  );

  return { state, setShelf, goShelf, onShelf };
}
