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
    () => null,
  );
  if (!t) return null;
  return (
    <div
      key={t.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 animate-acv-toast rounded-lg bg-ink px-5 py-3 text-sm font-medium text-card shadow-[0_10px_30px_rgba(0,0,0,.3)]"
    >
      {t.msg}
    </div>
  );
}
