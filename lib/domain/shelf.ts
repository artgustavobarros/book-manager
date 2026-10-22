/** Filtros, facetas e ordenação da Estante (porta de `estante()` do standalone). */
import { isBookStatus, isRead, STATUS } from "./status";
import { cmp, norm } from "./text";
import type { Book, BookStatus } from "./types";

// --- Facetas --------------------------------------------------------------

export type FacetKind =
  | "autor"
  | "genero"
  | "nacionalidade"
  | "editora"
  | "lidos-em";

/** Faceta serializável (o standalone guardava uma função; aqui cabe na URL). */
export interface Facet {
  kind: FacetKind;
  value: string;
}

const FACET_PREFIX: Record<FacetKind, string> = {
  autor: "Autor(a): ",
  genero: "Gênero: ",
  nacionalidade: "Nacionalidade: ",
  editora: "Editora: ",
  "lidos-em": "Lidos em ",
};

const GROUP_FIELD = {
  genero: "genre",
  nacionalidade: "nationality",
  editora: "publisher",
} as const satisfies Partial<Record<FacetKind, keyof Book>>;

export const NOT_INFORMED = "Não informado";

/** Chave de agrupamento dos gráficos: texto em minúsculas ou "não informado". */
export function groupKey(v: string | null | undefined): string {
  return (v || "").trim().toLowerCase() || NOT_INFORMED.toLowerCase();
}

export function facetLabel(f: Facet): string {
  return FACET_PREFIX[f.kind] + f.value;
}

export function facetTest(f: Facet): (b: Book) => boolean {
  switch (f.kind) {
    case "autor": {
      const n = norm(f.value);
      return (b) => norm(b.author) === n;
    }
    case "lidos-em":
      return (b) => String(b.yearRead) === f.value;
    default: {
      const field = GROUP_FIELD[f.kind];
      const key = f.value.trim().toLowerCase();
      return (b) => groupKey(b[field]) === key;
    }
  }
}

export function serializeFacet(f: Facet): string {
  return `${f.kind}:${f.value}`;
}

export function parseFacet(s: string | null | undefined): Facet | null {
  if (!s) {
    return null;
  }
  const i = s.indexOf(":");
  if (i < 0) {
    return null;
  }
  const kind = s.slice(0, i) as FacetKind;
  const value = s.slice(i + 1);
  return kind in FACET_PREFIX && value ? { kind, value } : null;
}

// --- Ordenação ------------------------------------------------------------

export const SORT_KEYS = [
  "ordem",
  "ordem-desc",
  "titulo",
  "titulo-desc",
  "autor",
  "editora",
  "lanc-novos",
  "lanc-antigos",
  "recentes",
  "paginas",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  ordem: "Nº · 1 → fim",
  "ordem-desc": "Nº · fim → 1",
  titulo: "Título · A–Z",
  "titulo-desc": "Título · Z–A",
  autor: "Autor(a) · A–Z",
  editora: "Editora · A–Z",
  "lanc-novos": "Lançamento · novos",
  "lanc-antigos": "Lançamento · antigos",
  recentes: "Aquisição · recentes",
  paginas: "Páginas · maiores",
};

export const SORT_GROUPS: readonly {
  label: string;
  opts: readonly (readonly [SortKey, string])[];
}[] = [
  {
    label: "Ordem da planilha",
    opts: [
      ["ordem", "1 → fim"],
      ["ordem-desc", "fim → 1"],
    ],
  },
  {
    label: "Título",
    opts: [
      ["titulo", "A–Z"],
      ["titulo-desc", "Z–A"],
    ],
  },
  { label: "Autor(a)", opts: [["autor", "A–Z"]] },
  { label: "Editora", opts: [["editora", "A–Z"]] },
  {
    label: "Lançamento",
    opts: [
      ["lanc-novos", "Novos"],
      ["lanc-antigos", "Antigos"],
    ],
  },
  { label: "Aquisição", opts: [["recentes", "Recentes"]] },
  { label: "Páginas", opts: [["paginas", "Maiores"]] },
];

const pg = (b: Book) => b.pages || 0;
const ordN = (b: Book) => b.orderNo || 1e9;

/** Como `cmp`, mas valores vazios (nulo, "" ou só espaços) vão para o fim. */
function cmpEmptyLast(a: string | null, b: string | null): number {
  const ea = !a?.trim();
  const eb = !b?.trim();
  return ea || eb ? Number(ea) - Number(eb) : cmp(a, b);
}

const COMPARATORS: Record<SortKey, (a: Book, b: Book) => number> = {
  ordem: (a, b) => ordN(a) - ordN(b),
  "ordem-desc": (a, b) => (b.orderNo || 0) - (a.orderNo || 0),
  titulo: (a, b) => cmp(a.title, b.title),
  "titulo-desc": (a, b) => cmp(b.title, a.title),
  autor: (a, b) => cmpEmptyLast(a.author, b.author),
  editora: (a, b) => cmpEmptyLast(a.publisher, b.publisher),
  "lanc-novos": (a, b) => (b.yearPublished || -1e4) - (a.yearPublished || -1e4),
  "lanc-antigos": (a, b) => (a.yearPublished || 1e4) - (b.yearPublished || 1e4),
  recentes: (a, b) => (b.acquiredOn || "").localeCompare(a.acquiredOn || ""),
  paginas: (a, b) => pg(b) - pg(a),
};

export function sortBooks(books: readonly Book[], sort: SortKey): Book[] {
  return [...books].sort(COMPARATORS[sort]);
}

// --- Filtros --------------------------------------------------------------

export type StatusFilter = "todos" | "fav" | BookStatus;

export interface ShelfFilters {
  facet: Facet | null;
  q: string;
  status: StatusFilter;
}

/** Campos pesquisados pela busca global. */
const SEARCH_FIELDS = [
  "title",
  "author",
  "publisher",
  "nationality",
  "genre",
  "borrower",
  "notes",
] as const;

/** "Lido" segue `isRead` (inclui emprestado já lido), como Painel e Dados contam. */
function matchesStatus(b: Book, status: StatusFilter): boolean {
  if (status === "todos") {
    return true;
  }
  if (status === "fav") {
    return b.favorite;
  }
  return status === "lido" ? isRead(b) : b.status === status;
}

export function filterBooks(
  books: readonly Book[],
  { q, status, facet }: ShelfFilters
): Book[] {
  const ql = norm(q);
  const test = facet ? facetTest(facet) : null;
  return books.filter(
    (b) =>
      (!test || test(b)) &&
      matchesStatus(b, status) &&
      (!ql || SEARCH_FIELDS.some((k) => norm(b[k]).includes(ql)))
  );
}

export interface Chip {
  count: number;
  dot: string | null;
  k: StatusFilter;
  label: string;
}

export function shelfChips(books: readonly Book[]): Chip[] {
  return [
    { k: "todos", label: "Todos", dot: null, count: books.length },
    ...STATUS.map((s) => ({
      k: s.k,
      label: s.plural,
      dot: s.dot,
      count: books.filter((b) => matchesStatus(b, s.k)).length,
    })),
    {
      k: "fav",
      label: "♥ Favoritos",
      dot: null,
      count: books.filter((b) => b.favorite).length,
    },
  ];
}

// --- Estado na URL --------------------------------------------------------

export type ShelfView = "grid" | "list";

export interface ShelfState extends ShelfFilters {
  page: number;
  sort: SortKey;
  view: ShelfView;
}

export const DEFAULT_SHELF: ShelfState = {
  q: "",
  status: "todos",
  facet: null,
  sort: "recentes",
  view: "grid",
  page: 1,
};

type ParamSource = { get(name: string): string | null };

export function parseShelfParams(params: ParamSource): ShelfState {
  const status = params.get("status");
  const sort = params.get("ordem");
  const view = params.get("vista");
  const rawPage = params.get("pagina");
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    q: params.get("q") ?? "",
    status: status === "fav" || isBookStatus(status) ? status : "todos",
    facet: parseFacet(params.get("faceta")),
    sort: SORT_KEYS.includes(sort as SortKey)
      ? (sort as SortKey)
      : DEFAULT_SHELF.sort,
    view: view === "lista" ? "list" : "grid",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** Serializa omitindo os valores padrão. */
export function toShelfParams(state: Partial<ShelfState>): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) {
    p.set("q", state.q);
  }
  if (state.status && state.status !== "todos") {
    p.set("status", state.status);
  }
  if (state.facet) {
    p.set("faceta", serializeFacet(state.facet));
  }
  if (state.sort && state.sort !== DEFAULT_SHELF.sort) {
    p.set("ordem", state.sort);
  }
  if (state.view === "list") {
    p.set("vista", "lista");
  }
  if (state.page && state.page > 1) {
    p.set("pagina", String(state.page));
  }
  return p;
}

/** Href da Estante com o estado indicado (usado pelos atalhos de Painel e Dados). */
export function shelfHref(state: Partial<ShelfState> = {}): string {
  const qs = toShelfParams(state).toString();
  return qs ? `/estante?${qs}` : "/estante";
}
