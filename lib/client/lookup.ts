/** Consultas aos catálogos públicos (no navegador, como no standalone). */
import { isbnOf } from "@/lib/domain/isbn";
import {
  amazonResult,
  fromApple,
  fromGoogle,
  fromOpenLibrary,
  type LookupResult,
  lookupUrls,
  mergeResults,
  titleMatch,
} from "@/lib/domain/lookup";

async function getJson(url: string, signal?: AbortSignal) {
  const r = await fetch(url, signal ? { signal } : undefined);
  if (!r.ok) {
    throw new Error(String(r.status));
  }
  return r.json();
}

/** Verifica se uma imagem carrega (a Amazon devolve 1×1 quando não há capa). */
function imgOk(url: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise((res) => {
    if (signal?.aborted) {
      res(false);
      return;
    }
    const i = new Image();
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      res(ok);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(false), 6000);
    signal?.addEventListener("abort", onAbort, { once: true });
    i.onload = () => finish(i.naturalWidth > 2);
    i.onerror = () => finish(false);
    i.src = url;
  });
}

const srcGoogle = async (
  q: string,
  isbn: string | null,
  signal?: AbortSignal
) => fromGoogle(await getJson(lookupUrls.google(q, isbn), signal));
const srcApple = async (q: string, signal?: AbortSignal) =>
  fromApple(await getJson(lookupUrls.apple(q), signal));
const srcOL = async (q: string, isbn: string | null, signal?: AbortSignal) =>
  fromOpenLibrary(await getJson(lookupUrls.openLibrary(q, isbn), signal));
async function srcAmazon(
  isbn: string,
  signal?: AbortSignal
): Promise<LookupResult[]> {
  const url = lookupUrls.amazonCover(isbn);
  return url && (await imgOk(url, signal)) ? [amazonResult(isbn, url)] : [];
}

/** Busca por título ou ISBN em todas as fontes, em paralelo. */
export async function searchCatalogs(
  q: string,
  options?: { signal?: AbortSignal }
): Promise<{ results: LookupResult[]; failed: boolean }> {
  const signal = options?.signal;
  const isbn = isbnOf(q);
  const jobs = [
    srcGoogle(q, isbn, signal),
    srcOL(q, isbn, signal),
    srcApple(isbn ?? q, signal),
  ];
  if (isbn) {
    jobs.push(srcAmazon(isbn, signal));
  }
  const settled = await Promise.allSettled(jobs);
  return {
    results: mergeResults(
      settled.map((s) => (s.status === "fulfilled" ? s.value : [])),
      q
    ),
    failed: settled.every((s) => s.status === "rejected"),
  };
}

/**
 * Capa automática: Apple → Google (intitle/inauthor) → Open Library, exigindo que o
 * título bata. `ok` indica se alguma fonte respondeu (para marcar como tentado).
 */
export async function findCover(b: {
  title: string;
  author: string | null;
}): Promise<{ url: string; ok: boolean }> {
  const q = b.title + " " + (b.author || "");
  const tries = [
    () => srcApple(q),
    async () =>
      fromGoogle(await getJson(lookupUrls.googleCover(b.title, b.author))),
    () => srcOL(q, null),
  ];
  let answered = false;
  for (const t of tries) {
    try {
      const rs: { title?: string; cover: string }[] = await t();
      answered = true;
      const hit = rs.find((r) => r.cover && titleMatch(r.title, b.title));
      if (hit) {
        return { url: hit.cover, ok: true };
      }
    } catch {
      // fonte indisponível: tenta a próxima
    }
  }
  return { url: "", ok: answered };
}
