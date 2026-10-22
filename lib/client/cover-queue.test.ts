import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCoverQueue } from "@/hooks/use-auto-covers";
import { findCover } from "@/lib/client/lookup";
import type { Book, BookFields } from "@/lib/domain/types";
import { makeBook } from "@/tests/support/reference";

vi.mock("@/lib/client/lookup", () => ({ findCover: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function queueWithBook() {
  const qc = new QueryClient();
  const book = makeBook({ coverUrl: null, coverCheckedAt: null });
  qc.setQueryData(["books"], [book]);
  const patchLocal = (id: string, patch: Partial<BookFields>) =>
    qc.setQueryData<Book[]>(["books"], (current) =>
      (current ?? []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
    );
  const queue = createCoverQueue();
  queue.setDeps({ qc, patchLocal });
  const saved = () => qc.getQueryData<Book[]>(["books"])?.[0];
  const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  return { book, fetcher, patchLocal, queue, saved };
}

describe("fila de capas automáticas", () => {
  it("não troca a capa manual quando a busca termina depois da edição", async () => {
    const { book, fetcher, patchLocal, queue, saved } = queueWithBook();
    let finish!: (result: { url: string; ok: boolean }) => void;
    vi.mocked(findCover).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    queue.enqueue(book.id);
    patchLocal(book.id, { coverUrl: "https://manual.example/capa.jpg" });
    finish({ url: "https://auto.example/capa.jpg", ok: true });
    await Promise.resolve();
    await Promise.resolve();
    queue.flush();
    expect(saved()?.coverUrl).toBe("https://manual.example/capa.jpg");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("descarta o lote se a capa manual mudar após a busca", async () => {
    const { book, fetcher, patchLocal, queue } = queueWithBook();
    vi.mocked(findCover).mockResolvedValue({
      url: "https://auto.example/capa.jpg",
      ok: true,
    });
    queue.enqueue(book.id);
    await Promise.resolve();
    await Promise.resolve();
    patchLocal(book.id, { coverUrl: "https://manual.example/capa.jpg" });
    queue.flush();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
