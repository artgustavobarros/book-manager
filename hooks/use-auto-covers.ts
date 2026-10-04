"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { findCover } from "@/lib/client/lookup";
import type { Book, BookFields } from "@/lib/domain/types";

import { BOOKS_KEY, useBookActions } from "./use-books";

const MAX_ACTIVE = 2;
const FLUSH_MS = 2000;
const FLUSH_SIZE = 20;

type Pending = { id: string; coverUrl?: string; coverCheckedAt: string };
type Deps = {
  qc: QueryClient;
  patchLocal: (id: string, patch: Partial<BookFields>) => void;
};

/** Fila de busca de capas + buffer de gravação em lote (independente do render). */
function createCoverQueue() {
  let deps: Deps | null = null;
  const getDeps = () => deps!;
  const queued = new Set<string>();
  const queue: string[] = [];
  const buffer: Pending[] = [];
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const bookById = (id: string) =>
    deps?.qc.getQueryData<Book[]>(BOOKS_KEY)?.find((b) => b.id === id);

  function flush(keepalive = false) {
    clearTimeout(timer);
    const items = buffer.splice(0);
    if (!items.length) {
      return;
    }
    void fetch("/api/books", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(items),
      keepalive,
    }).catch(() => {
      // Sem rede: as capas são buscadas de novo numa próxima visita.
    });
  }

  function record(item: Pending) {
    buffer.push(item);
    if (buffer.length >= FLUSH_SIZE) {
      flush();
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => flush(), FLUSH_MS);
    }
  }

  function pump() {
    while (active < MAX_ACTIVE && queue.length) {
      const id = queue.shift()!;
      const book = bookById(id);
      if (!book) {
        queued.delete(id);
        continue;
      }
      active++;
      findCover(book)
        .then((r) => {
          if (!r.ok) {
            return;
          }
          const coverCheckedAt = new Date().toISOString();
          const cover = r.url ? { coverUrl: r.url } : {};
          getDeps().patchLocal(id, { coverCheckedAt, ...cover });
          record({ id, coverCheckedAt, ...cover });
        })
        .catch(() => {})
        .finally(() => {
          active--;
          queued.delete(id);
          pump();
        });
    }
  }

  function enqueue(id: string) {
    const book = bookById(id);
    if (!book || book.coverUrl || book.coverCheckedAt || queued.has(id)) {
      return;
    }
    queued.add(id);
    queue.push(id);
    pump();
  }

  return {
    enqueue,
    flush,
    setDeps: (d: Deps) => {
      deps = d;
    },
  };
}

/**
 * Capas automáticas (porta de queueCover/pump do standalone): quando a capa de um livro
 * sem imagem chega a 200px da viewport, busca nas fontes (no máx. 2 ao mesmo tempo).
 * O resultado aparece na hora e é gravado em lote (PATCH /api/books) a cada ~2s ou 20
 * livros, e no `pagehide` com keepalive.
 */
export function useAutoCovers(enabled = true) {
  const qc = useQueryClient();
  const { patchLocal } = useBookActions();
  const [coverQueue] = useState(createCoverQueue);
  useEffect(() => coverQueue.setDeps({ qc, patchLocal }));
  const io = useRef<IntersectionObserver | null>(null);
  const observed = useRef(new Set<HTMLElement>());

  /**
   * O observer nasce sob demanda no próprio ref callback: os refs do primeiro render
   * são ligados antes dos efeitos, então criá-lo num useEffect deixava esses cards de fora.
   */
  const observer = useCallback(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return null;
    }
    if (!io.current) {
      io.current = new IntersectionObserver(
        (entries) =>
          entries.forEach(
            (e) =>
              e.isIntersecting &&
              coverQueue.enqueue((e.target as HTMLElement).dataset.bid!)
          ),
        { rootMargin: "200px" }
      );
      observed.current.forEach((el) => io.current!.observe(el));
    }
    return io.current;
  }, [enabled, coverQueue]);

  useEffect(() => {
    // Recria o observer se o efeito anterior o desconectou (StrictMode, `enabled` mudou).
    if (observed.current.size) {
      observer();
    }
    const onHide = () => coverQueue.flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      io.current?.disconnect();
      io.current = null;
      window.removeEventListener("pagehide", onHide);
      coverQueue.flush(true);
    };
  }, [observer, coverQueue]);

  /** Ref callback para o elemento da capa (precisa de `data-bid`). */
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) {
        return;
      }
      observed.current.add(el);
      observer()?.observe(el);
      return () => {
        observed.current.delete(el);
        io.current?.unobserve(el);
      };
    },
    [observer]
  );
}
