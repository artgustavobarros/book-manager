/** Normalização das fontes de busca online (porta de srcGoogle/srcApple/srcOL/srcAmazon). */
import { isbn10, isbnOf } from "./isbn";
import { norm } from "./text";

export type LookupSource =
  | "Google Livros"
  | "Apple Books"
  | "Open Library"
  | "Amazon (ISBN)";

export interface LookupResult {
  author: string;
  cover: string;
  /** Resultado que só traz a capa (Amazon por ISBN). */
  coverOnly?: boolean;
  genre: string;
  pages: string;
  publisher: string;
  source: LookupSource;
  title: string;
  year: string;
}

const enc = encodeURIComponent;

export const lookupUrls = {
  google: (q: string, isbn: string | null) =>
    "https://www.googleapis.com/books/v1/volumes?maxResults=6&q=" +
    (isbn ? "isbn:" + isbn : enc(q)),
  googleCover: (title: string, author: string | null) =>
    "https://www.googleapis.com/books/v1/volumes?maxResults=5&q=" +
    enc(
      "intitle:" +
        title +
        (author ? " inauthor:" + author.split(" ").pop() : "")
    ),
  apple: (q: string) =>
    "https://itunes.apple.com/search?country=br&media=ebook&limit=5&term=" +
    enc(q),
  openLibrary: (q: string, isbn: string | null) =>
    "https://openlibrary.org/search.json?limit=6&fields=title,author_name,publisher,first_publish_year,number_of_pages_median,cover_i,subject&" +
    (isbn ? "isbn=" + isbn : "q=" + enc(q)),
  amazonCover: (isbn: string) => {
    const i10 = isbn10(isbn);
    return i10
      ? "https://images-na.ssl-images-amazon.com/images/P/" + i10 + ".01.L.jpg"
      : null;
  },
};

// biome-ignore lint/suspicious/noExplicitAny: External book APIs return untyped payloads.
type Json = Record<string, any>;

export function fromGoogle(d: Json): LookupResult[] {
  return (d.items || []).map((it: Json) => {
    const v = it.volumeInfo || {};
    const im = v.imageLinks || {};
    return {
      source: "Google Livros",
      title: v.title || "",
      author: (v.authors || []).join(", "),
      genre: (v.categories || [])[0] || "",
      publisher: v.publisher || "",
      year: (v.publishedDate || "").slice(0, 4),
      pages: v.pageCount ? String(v.pageCount) : "",
      cover: (im.thumbnail || im.smallThumbnail || "")
        .replace("http:", "https:")
        .replace("&edge=curl", ""),
    } satisfies LookupResult;
  });
}

export function fromApple(d: Json): LookupResult[] {
  return (d.results || []).map(
    (r: Json): LookupResult => ({
      source: "Apple Books",
      title: r.trackName || "",
      author: r.artistName || "",
      genre: r.primaryGenreName === "Books" ? "" : r.primaryGenreName || "",
      publisher: "",
      year: (r.releaseDate || "").slice(0, 4),
      pages: "",
      cover: (r.artworkUrl100 || "").replace(/100x100bb/, "600x600bb"),
    })
  );
}

export function fromOpenLibrary(d: Json): LookupResult[] {
  return (d.docs || []).map(
    (x: Json): LookupResult => ({
      source: "Open Library",
      title: x.title || "",
      author: (x.author_name || []).join(", "),
      genre: (x.subject || [])[0] || "",
      publisher: (x.publisher || [])[0] || "",
      year: x.first_publish_year ? String(x.first_publish_year) : "",
      pages: x.number_of_pages_median ? String(x.number_of_pages_median) : "",
      cover: x.cover_i
        ? "https://covers.openlibrary.org/b/id/" + x.cover_i + "-L.jpg"
        : "",
    })
  );
}

export function amazonResult(isbn: string, url: string): LookupResult {
  return {
    source: "Amazon (ISBN)",
    title: "Capa pelo ISBN " + isbn,
    author: "",
    genre: "",
    publisher: "",
    year: "",
    pages: "",
    cover: url,
    coverOnly: true,
  };
}

const LINK_WORDS = new Set([
  "a",
  "as",
  "e",
  "o",
  "os",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "um",
  "uma",
]);

function searchWords(query: string): string[] {
  const words = query.split(" ").filter(Boolean);
  const meaningful = words.filter((word) => !LINK_WORDS.has(word));
  return meaningful.length ? meaningful : words;
}

function matchingWords(queryWords: string[], text: string): number {
  const words = text.split(" ");
  return queryWords.filter((queryWord) =>
    words.some(
      (word) =>
        word === queryWord ||
        (queryWord.length >= 3 && word.startsWith(queryWord))
    )
  ).length;
}

/** Faixa, cobertura do título, cobertura do autor e proximidade do tamanho. */
function textRank(
  result: LookupResult,
  query: string,
  queryWords: string[]
): readonly number[] {
  const title = norm(result.title);
  const author = norm(result.author);
  const titleMatches = matchingWords(queryWords, title);
  const authorMatches = matchingWords(queryWords, author);
  let tier = 0;
  if (title === query) {
    tier = 6;
  } else if (title.startsWith(query + " ")) {
    tier = 5;
  } else if (title.includes(" " + query + " ") || title.endsWith(" " + query)) {
    tier = 4;
  } else if (queryWords.length > 0 && titleMatches === queryWords.length) {
    tier = 3;
  } else if (titleMatches > 0) {
    tier = 2;
  } else if (authorMatches > 0) {
    tier = 1;
  }
  const distance = Math.abs(title.split(" ").length - queryWords.length);
  return [tier, titleMatches, authorMatches, -distance];
}

function isbnSourceRank(result: LookupResult): number {
  if (result.source === "Google Livros" || result.source === "Open Library") {
    return 2;
  }
  return result.source === "Apple Books" ? 1 : 0;
}

/** Deduplica antes de classificar e limitar os resultados visíveis. */
export function mergeResults(
  groups: readonly LookupResult[][],
  query: string,
  limit = 12
): LookupResult[] {
  const all: LookupResult[] = [];
  const seen = new Set<string>();
  for (const r of groups.flat()) {
    const k = r.source + norm(r.title) + norm(r.author) + r.year;
    if (r.title && !seen.has(k)) {
      seen.add(k);
      all.push(r);
    }
  }
  if (isbnOf(query)) {
    const coverOnly = all.find((result) => result.coverOnly);
    const records = all.filter((result) => !result.coverOnly);
    records.sort(
      (a, b) =>
        isbnSourceRank(b) - isbnSourceRank(a) ||
        Number(Boolean(b.cover)) - Number(Boolean(a.cover))
    );
    return coverOnly
      ? [...records.slice(0, Math.max(0, limit - 1)), coverOnly].slice(0, limit)
      : records.slice(0, limit);
  }

  const normalizedQuery = norm(query);
  const words = searchWords(normalizedQuery);
  const ranked = all.map((result, index) => ({
    result,
    index,
    rank: textRank(result, normalizedQuery, words),
  }));
  ranked.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      if (a.rank[i] !== b.rank[i]) {
        return b.rank[i] - a.rank[i];
      }
    }
    return (
      Number(Boolean(b.result.cover)) - Number(Boolean(a.result.cover)) ||
      a.index - b.index
    );
  });
  return ranked.slice(0, limit).map(({ result }) => result);
}

/** Correspondência frouxa de título usada pelas capas automáticas. */
export function titleMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const x = norm(a);
  const y = norm(b).slice(0, 14);
  return !!x && !!y && (x.includes(y) || y.includes(x.slice(0, 14)));
}
