"use client";

import { useCallback, useRef } from "react";

/** Ignora ativações repetidas enquanto a primeira operação assíncrona termina. */
export function useSingleFlight() {
  const busy = useRef(false);
  return useCallback(async (action: () => Promise<void>) => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    try {
      await action();
    } finally {
      busy.current = false;
    }
  }, []);
}
