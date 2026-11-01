"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { useApp } from "@/components/app/app-provider";
import {
  parseShelfParams,
  type ShelfState,
  shelfHref,
  toShelfParams,
} from "@/lib/domain/shelf";

/**
 * Estado da Estante na URL (?q, leitura, situacao, faceta, ordem, vista), com a
 * vista ("grid" | "list") persistida como preferência do usuário em cookie/contexto.
 * Na própria Estante, atualiza com history.replaceState; de outras páginas, navega para /estante.
 */
export function useShelfState() {
  const { shelfView, setShelfView, startRouteTransition } = useApp();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const onShelf = pathname === "/estante";
  const state = useMemo(
    () => parseShelfParams(onShelf ? params : new URLSearchParams(), shelfView),
    [params, onShelf, shelfView]
  );

  // Se a pessoa abriu um link direto com ?vista=lista ou ?vista=capas, lembra da escolha.
  useEffect(() => {
    if (onShelf && state.view !== shelfView) {
      setShelfView(state.view);
    }
  }, [onShelf, state.view, shelfView, setShelfView]);

  const setShelf = useCallback(
    (
      patch: Partial<ShelfState>,
      { reset = false }: { reset?: boolean } = {}
    ) => {
      const nextView = patch.view ?? state.view;
      if (patch.view && patch.view !== shelfView) {
        setShelfView(patch.view);
      }
      const next = reset
        ? { ...patch, view: nextView }
        : {
            ...state,
            ...patch,
            page: patch.page ?? ("view" in patch ? state.page : 1),
          };
      if (onShelf) {
        const qs = toShelfParams(next, nextView).toString();
        window.history["page" in patch ? "pushState" : "replaceState"](
          null,
          "",
          qs ? `/estante?${qs}` : "/estante"
        );
      } else {
        startRouteTransition("/estante", pathname);
        router.push(shelfHref(next, nextView));
        window.scrollTo({ top: 0 });
      }
    },
    [
      state,
      onShelf,
      pathname,
      router,
      shelfView,
      setShelfView,
      startRouteTransition,
    ]
  );

  /** Vai para a Estante com um filtro novo (atalhos de Painel/Dados/autor), preservando a vista preferida. */
  const goShelf = useCallback(
    (patch: Partial<ShelfState> = {}) => {
      const targetView = patch.view ?? shelfView;
      if (patch.view && patch.view !== shelfView) {
        setShelfView(patch.view);
      }
      if (!onShelf) {
        startRouteTransition("/estante", pathname);
      }
      router.push(shelfHref({ ...patch, view: targetView }, targetView));
      window.scrollTo({ top: 0 });
    },
    [onShelf, pathname, router, shelfView, setShelfView, startRouteTransition]
  );

  return { state, setShelf, goShelf, onShelf };
}
