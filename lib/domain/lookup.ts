/** Normalização das fontes de busca online (porta de srcGoogle/srcApple/srcOL/srcAmazon). */
import { isbn10 } from "./isbn";
import { norm } from "./text";

export type LookupSource = "Google Livros" | "Apple Books" | "Open Library" | "Amazon (ISBN)";

export interface LookupResult {
  source: LookupSource;
  title: string;
  author: string;
  publisher: string;
  year: string;
  pages: string;
  cover: string;
  /** Resultado que só traz a capa (Amazon por ISBN). */
  coverOnly?: boolean;
}

const enc = encodeURIComponent;

export const lookupUrls = {
  google: (q: string, isbn: string | null) =>
    "https://www.googleapis.com/books/v1/volumes?maxResults=6&q=" + (isbn ? "isbn:" + isbn : enc(q)),
  googleCover: (title: string, author: string | null) =>
    "https://www.googleapis.com/books/v1/volumes?maxResults=5&q=" +
    enc("intitle:" + title + (author ? " inauthor:" + author.split(" ").pop() : "")),
  apple: (q: string) => "https://itunes.apple.com/search?country=br&media=ebook&limit=5&term=" + enc(q),
  openLibrary: (q: string, isbn: string | null) =>
    "https://openlibrary.org/search.json?limit=6&fields=title,author_name,publisher,first_publish_year,number_of_pages_median,cover_i&" +
    (isbn ? "isbn=" + isbn : "q=" + enc(q)),
  amazonCover: (isbn: string) => {
    const i10 = isbn10(isbn);
    return i10 ? "https://images-na.ssl-images-amazon.com/images/P/" + i10 + ".01.L.jpg" : null;
  },
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function fromGoogle(d: Json): LookupResult[] {
  return (d.items || []).map((it: Json) => {
    const v = it.volumeInfo || {};
    const im = v.imageLinks || {};
    return {
      source: "Google Livros",
      title: v.title || "",
      author: (v.authors || []).join(", "),
      publisher: v.publisher || "",
      year: (v.publishedDate || "").slice(0, 4),
      pages: v.pageCount ? String(v.pageCount) : "",
      cover: (im.thumbnail || im.smallThumbnail || "").replace("http:", "https:").replace("&edge=curl", ""),
    } satisfies LookupResult;
  });
}

export function fromApple(d: Json): LookupResult[] {
  return (d.results || []).map(
    (r: Json): LookupResult => ({
      source: "Apple Books",
      title: r.trackName || "",
      author: r.artistName || "",
      publisher: "",
      year: (r.releaseDate || "").slice(0, 4),
      pages: "",
      cover: (r.artworkUrl100 || "").replace(/100x100bb/, "600x600bb"),
    }),
  );
}

export function fromOpenLibrary(d: Json): LookupResult[] {
  return (d.docs || []).map(
    (x: Json): LookupResult => ({
      source: "Open Library",
      title: x.title || "",
      author: (x.author_name || []).join(", "),
      publisher: (x.publisher || [])[0] || "",
      year: x.first_publish_year ? String(x.first_publish_year) : "",
      pages: x.number_of_pages_median ? String(x.number_of_pages_median) : "",
      cover: x.cover_i ? "https://covers.openlibrary.org/b/id/" + x.cover_i + "-L.jpg" : "",
    }),
  );
}

export function amazonResult(isbn: string, url: string): LookupResult {
  return { source: "Amazon (ISBN)", title: "Capa pelo ISBN " + isbn, author: "", publisher: "", year: "", pages: "", cover: url, coverOnly: true };
}

/** Deduplica por fonte+título+autor+ano, mantém só resultados com título e prioriza os com capa. */
export function mergeResults(groups: readonly LookupResult[][], limit = 12): LookupResult[] {
  const all: LookupResult[] = [];
  const seen = new Set<string>();
  for (const r of groups.flat()) {
    const k = r.source + norm(r.title) + norm(r.author) + r.year;
    if (r.title && !seen.has(k)) {
      seen.add(k);
      all.push(r);
    }
  }
  all.sort((a, b) => (b.cover ? 1 : 0) - (a.cover ? 1 : 0));
  return all.slice(0, limit);
}

/** Correspondência frouxa de título usada pelas capas automáticas. */
export function titleMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = norm(a);
  const y = norm(b).slice(0, 14);
  return !!x && !!y && (x.includes(y) || y.includes(x.slice(0, 14)));
}
