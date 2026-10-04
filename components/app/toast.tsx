"use client";

import { useSyncExternalStore } from "react";

/** Toast do design: um por vez, centralizado no rodapé, some após 2,4 s. */
const DURATION = 2400;

let current: { id: number; msg: string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(msg: string) {
  clearTimeout(timer);
  // Novo id reinicia a animação mesmo com a mesma mensagem.
  current = { id: (current?.id ?? 0) + 1, msg };
  emit();
  timer = setTimeout(() => {
    current = null;
    emit();
  }, DURATION);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Toaster() {
  const t = useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
  // A região viva fica sempre montada: leitores de tela costumam ignorar regiões
  // que já nascem com conteúdo.
  return (
    <div aria-atomic="true" aria-live="polite" role="status">
      {t ? (
        <div
          className="fixed bottom-7 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 animate-acv-toast rounded-lg bg-ink px-5 py-3 text-center font-medium text-card text-sm shadow-[0_10px_30px_rgba(0,0,0,.3)] max-[640px]:bottom-36"
          key={t.id}
        >
          {t.msg}
        </div>
      ) : null}
    </div>
  );
}
