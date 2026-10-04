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

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(String(r.status));
  }
  return r.json();
}

/** Verifica se uma imagem carrega (a Amazon devolve 1×1 quando não há capa). */
function imgOk(url: string): Promise<boolean> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i.naturalWidth > 2);
    i.onerror = () => res(false);
    i.src = url;
    setTimeout(() => res(false), 6000);
  });
}

const srcGoogle = async (q: string, isbn: string | null) =>
  fromGoogle(await getJson(lookupUrls.google(q, isbn)));
const srcApple = async (q: string) =>
  fromApple(await getJson(lookupUrls.apple(q)));
const srcOL = async (q: string, isbn: string | null) =>
  fromOpenLibrary(await getJson(lookupUrls.openLibrary(q, isbn)));
async function srcAmazon(isbn: string): Promise<LookupResult[]> {
  const url = lookupUrls.amazonCover(isbn);
  return url && (await imgOk(url)) ? [amazonResult(isbn, url)] : [];
}

/** Busca por título ou ISBN em todas as fontes, em paralelo. */
export async function searchCatalogs(
  q: string
): Promise<{ results: LookupResult[]; failed: boolean }> {
  const isbn = isbnOf(q);
  const jobs = [srcGoogle(q, isbn), srcOL(q, isbn), srcApple(isbn ?? q)];
  if (isbn) {
    jobs.push(srcAmazon(isbn));
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
      (await getJson(lookupUrls.googleCover(b.title, b.author))).items?.map(
        (it: {
          volumeInfo?: { title?: string; imageLinks?: { thumbnail?: string } };
        }) => ({
          title: it.volumeInfo?.title,
          cover: (it.volumeInfo?.imageLinks?.thumbnail || "")
            .replace("http:", "https:")
            .replace("&edge=curl", ""),
        })
      ) ?? [],
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
