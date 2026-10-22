/**
 * Estante pública e compartilhamento (handoff `compartilhamento.md`; `ogFor`, `pubPath`
 * e `pubVals` do protótipo). Funções puras: rodam no servidor (página, metadados e
 * imagem OG) e no cliente (modal do dono e página do visitante).
 */
import { coverColors, hash } from "./cover";
import type { Facet, ReadingFilter } from "./shelf";
import { cmp, nf, norm } from "./text";
import type { Book, PublicBook } from "./types";

// --- Recorte ------------------------------------------------------------------

/** Leituras que o visitante pode filtrar (Abandonado aparece só em "Todos"). */
export const PUBLIC_READINGS = ["lido", "lendo", "nao-lido"] as const;
export type PublicReading = (typeof PUBLIC_READINGS)[number];

/** Rótulo da Leitura no recorte ("Livros lidos na estante de Ana"). */
export const READING_SHORT: Record<PublicReading, string> = {
  lido: "Livros lidos",
  lendo: "Lendo agora",
  "nao-lido": "Ainda não lidos",
};

/** Rótulo da Leitura no controle segmentado e nos chips. */
export const READING_TAB: Record<PublicReading, string> = {
  lido: "Lidos",
  lendo: "Lendo",
  "nao-lido": "Não lidos",
};

const READING_PHRASE: Record<PublicReading, string> = {
  lido: "os livros que já leu",
  lendo: "o que está lendo agora",
  "nao-lido": "os livros que ainda não leu",
};

/** O que o link mostra ao abrir: gênero (slug), Leitura e/ou um livro. Vazio = nada. */
export interface PublicSelection {
  bookId: string;
  genre: string;
  reading: PublicReading | "";
}

export const EMPTY_SELECTION: PublicSelection = {
  genre: "",
  reading: "",
  bookId: "",
};

export function isPublicReading(v: unknown): v is PublicReading {
  return PUBLIC_READINGS.includes(v as PublicReading);
}

/** Nome → trecho de URL: sem acento, minúsculo, hífens no lugar do resto. */
export function slugify(s: unknown): string {
  return norm(s)
    .replace(/#/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
}

/** Slug-base do dono na primeira publicação ("leitor" quando o nome é vazio). */
export function ownerSlugBase(name: string | null | undefined): string {
  return slugify(name) || "leitor";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Caminho público do recorte, com os parâmetros sempre na ordem genero, leitura, livro. */
export function publicPath(
  slug: string,
  sel: Partial<PublicSelection>
): string {
  const q = new URLSearchParams();
  if (sel.genre) {
    q.set("genero", sel.genre);
  }
  if (sel.reading) {
    q.set("leitura", sel.reading);
  }
  if (sel.bookId) {
    q.set("livro", sel.bookId);
  }
  const qs = q.toString();
  return "/estante/" + slug + (qs ? "?" + qs : "");
}

/**
 * Caminho canônico da imagem OG do recorte, com a versão atual do acervo em `v`.
 * A imagem de um livro ignora gênero e Leitura, então eles saem da URL.
 */
export function ogImagePath(
  slug: string,
  sel: Partial<PublicSelection>,
  version: string
): string {
  const path = publicPath(slug, sel.bookId ? { bookId: sel.bookId } : sel);
  return "/og" + path + (path.includes("?") ? "&" : "?") + "v=" + version;
}

/** Mantém do recorte só o gênero e o livro que existem na estante (a Leitura já é válida). */
export function resolvePublicSelection(
  sel: PublicSelection,
  books: readonly PublicBook[]
): PublicSelection {
  return {
    genre:
      sel.genre && books.some((b) => slugify(b.genre) === sel.genre)
        ? sel.genre
        : "",
    reading: sel.reading,
    bookId:
      sel.bookId && books.some((b) => b.id === sel.bookId) ? sel.bookId : "",
  };
}

/** Projeção pública dos livros do dono (mesmos campos e exclusão do servidor; sem a Situação). */
export function toPublicBooks(books: readonly Book[]): PublicBook[] {
  const out: PublicBook[] = [];
  for (const b of books) {
    if (b.situation === "doado") {
      continue;
    }
    out.push({
      id: b.id,
      title: b.title,
      author: b.author,
      genre: b.genre,
      pages: b.pages,
      publisher: b.publisher,
      yearPublished: b.yearPublished,
      reading: b.reading,
      coverUrl: b.coverUrl,
    });
  }
  return out;
}

// --- Gêneros ------------------------------------------------------------------

export interface GenreCount {
  count: number;
  label: string;
  slug: string;
}

/** Gêneros dos livros (com o texto da primeira ocorrência), sem ordem definida. */
export function genreCounts(books: readonly PublicBook[]): GenreCount[] {
  const map = new Map<string, GenreCount>();
  for (const b of books) {
    const slug = slugify(b.genre);
    if (!slug) {
      continue;
    }
    const g = map.get(slug) ?? {
      slug,
      label: (b.genre ?? "").trim(),
      count: 0,
    };
    g.count += 1;
    map.set(slug, g);
  }
  return [...map.values()];
}

export function genreLabel(books: readonly PublicBook[], slug: string): string {
  return genreCounts(books).find((g) => g.slug === slug)?.label ?? slug;
}

// --- Filtros do visitante -----------------------------------------------------

export interface PublicFilters {
  genre: string;
  q: string;
  reading: PublicReading | "";
}

/** Livros visíveis com busca (título ou autor) e filtros, ordenados por título. */
export function filterPublicBooks(
  books: readonly PublicBook[],
  { genre, reading, q }: PublicFilters
): PublicBook[] {
  const qn = norm(q);
  return books
    .filter(
      (b) =>
        (!genre || slugify(b.genre) === genre) &&
        (!reading || b.reading === reading) &&
        (!qn || norm(b.title + " " + (b.author ?? "")).includes(qn))
    )
    .sort((a, b) => cmp(a.title, b.title));
}

/** "1 livro", "1.234 livros". */
export function booksLabel(n: number): string {
  return nf(n) + (n === 1 ? " livro" : " livros");
}

/** "Sorteado entre 12 livros desta seleção" (ou "da estante", sem filtro nem busca). */
export function drawPoolLabel(n: number, filtered: boolean): string {
  return (
    "Sorteado entre " +
    booksLabel(n) +
    (filtered ? " desta seleção" : " da estante")
  );
}

/** Aviso do recorte compartilhado ("Ana compartilhou os livros de Romance…"). */
export function sharedNotice(
  ownerName: string,
  from: PublicSelection,
  books: readonly PublicBook[]
): string {
  const first = firstName(ownerName);
  const book = from.bookId ? books.find((b) => b.id === from.bookId) : null;
  if (book) {
    return (
      first +
      " compartilhou “" +
      book.title +
      "” com você. O restante da estante está logo abaixo."
    );
  }
  const g = from.genre ? genreLabel(books, from.genre) : "";
  if (!(g || from.reading)) {
    return "";
  }
  let what = g
    ? "os livros de " + g
    : READING_PHRASE[from.reading as PublicReading];
  if (g && from.reading) {
    what += " (" + READING_SHORT[from.reading].toLowerCase() + ")";
  }
  return (
    first +
    " compartilhou " +
    what +
    ". Mude os filtros à vontade para ver o resto."
  );
}

// --- Open Graph ---------------------------------------------------------------

export interface OgCover {
  author: string;
  bg: string;
  coverUrl: string | null;
  ink: string;
  title: string;
}

export interface OgData {
  /** Recorte (gênero, Leitura) ou "Toda a estante"; autor no card de livro. */
  accent: string;
  covers: OgCover[];
  description: string;
  eyebrow: string;
  /** Contagem no card de estante; gênero · páginas no card de livro. */
  foot: string;
  headline: string;
  title: string;
  variant: "shelf" | "book";
}

const OG_TAIL =
  ". Veja a estante, filtre por gênero e sorteie sua próxima leitura.";

function ogCover(b: PublicBook): OgCover {
  const { coverBg, coverInk } = coverColors(b.title, b.author);
  return {
    title: b.title,
    author: b.author ?? "",
    coverUrl: b.coverUrl,
    bg: coverBg,
    ink: coverInk,
  };
}

/** Rótulo do recorte de gênero e/ou Leitura ("Romance", "Livros lidos", "Romance (livros lidos)"). */
function selectionLabel(
  books: readonly PublicBook[],
  sel: PublicSelection
): string {
  const g = sel.genre ? genreLabel(books, sel.genre) : "";
  const s = sel.reading ? READING_SHORT[sel.reading] : "";
  if (g && s) {
    return g + " (" + s.toLowerCase() + ")";
  }
  return g || s;
}

/** Textos e capas do card social do recorte (página, imagem OG e prévia do modal). */
export function ogFor(
  books: readonly PublicBook[],
  ownerName: string,
  sel: PublicSelection
): OgData {
  const name = ownerName.trim() || "Leitor";
  const book = sel.bookId ? books.find((b) => b.id === sel.bookId) : null;
  if (book) {
    return {
      variant: "book",
      eyebrow: "Da estante de " + name,
      headline: book.title,
      accent: book.author ?? "",
      foot: [book.genre, book.pages ? nf(book.pages) + " páginas" : ""]
        .filter(Boolean)
        .join(" · "),
      covers: [ogCover(book)],
      title:
        book.title +
        (book.author ? ", de " + book.author : "") +
        " · na estante de " +
        firstName(name),
      description:
        "Veja a ficha deste livro e o restante da estante de " +
        name +
        " na Bodega Literária.",
    };
  }
  const list = filterPublicBooks(books, { ...sel, q: "" });
  const filt = selectionLabel(books, sel);
  const picks = [...list]
    .sort(
      (a, b) =>
        Number(!!b.coverUrl) - Number(!!a.coverUrl) || cmp(a.title, b.title)
    )
    .slice(0, 5);
  const count = booksLabel(list.length);
  return {
    variant: "shelf",
    eyebrow: "A estante de",
    headline: name,
    accent: filt || "Toda a estante",
    foot: count,
    covers: picks.map(ogCover),
    title: filt ? filt + " na estante de " + name : "Estante de " + name,
    description: count + (filt ? " nesta seleção" : " catalogados") + OG_TAIL,
  };
}

/** Versão curta do estado público (muda a URL da imagem OG quando algo muda). */
export function ogVersion(
  count: number,
  lastUpdate: string | null,
  name: string
): string {
  return hash(count + "|" + (lastUpdate ?? "") + "|" + name).toString(36);
}

// --- Destinos -----------------------------------------------------------------

export interface ShareTarget {
  href: string;
  label: string;
}

/** Intenções de compartilhamento de cada rede com o título OG e a URL codificados. */
export function shareTargets(url: string, og: OgData): ShareTarget[] {
  const e = encodeURIComponent;
  const text = og.title;
  return [
    { label: "WhatsApp", href: "https://wa.me/?text=" + e(text + " " + url) },
    {
      label: "X",
      href: "https://x.com/intent/post?text=" + e(text) + "&url=" + e(url),
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/sharer/sharer.php?u=" + e(url),
    },
    {
      label: "Threads",
      href: "https://www.threads.net/intent/post?text=" + e(text + " " + url),
    },
    {
      label: "Telegram",
      href: "https://t.me/share/url?url=" + e(url) + "&text=" + e(text),
    },
    {
      label: "E-mail",
      href:
        "mailto:?subject=" +
        e(text) +
        "&body=" +
        e(og.description + "\n\n" + url),
    },
  ];
}

// --- Modal do dono ------------------------------------------------------------

export type ShareKind = "todos" | "genero" | "leitura" | "livro";

export interface ShareScope {
  bookId?: string;
  genre?: string;
  kind: ShareKind;
  reading?: PublicReading;
}

/** Recorte enviado para o escopo escolhido (só o campo do tipo ativo vale). */
export function selectionOf(scope: ShareScope): PublicSelection {
  return {
    genre: scope.kind === "genero" ? (scope.genre ?? "") : "",
    reading: scope.kind === "leitura" ? (scope.reading ?? "") : "",
    bookId: scope.kind === "livro" ? (scope.bookId ?? "") : "",
  };
}

/** Escopo inicial do modal a partir do chip e da faceta da Estante. */
export function scopeFromShelf(
  state: { reading: ReadingFilter; facet: Facet | null },
  books: readonly PublicBook[]
): ShareScope {
  if (isPublicReading(state.reading)) {
    return { kind: "leitura", reading: state.reading };
  }
  if (state.facet?.kind === "genero") {
    const slug = slugify(state.facet.value);
    if (slug && books.some((b) => slugify(b.genre) === slug)) {
      return { kind: "genero", genre: slug };
    }
  }
  return { kind: "todos" };
}
