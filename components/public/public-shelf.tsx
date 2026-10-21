"use client";

import { ShuffleIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { ComboboxField } from "@/components/custom/combobox-field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Segmented } from "@/components/ui/segmented";
import { copyText } from "@/lib/client/clipboard";
import {
  booksLabel,
  drawPoolLabel,
  filterPublicBooks,
  firstName,
  genreCounts,
  PUBLIC_STATUSES,
  type PublicSelection,
  type PublicStatus,
  publicPath,
  STATUS_TAB,
  sharedNotice,
} from "@/lib/domain/share";
import { stat } from "@/lib/domain/status";
import { drawBook } from "@/lib/domain/surprise";
import { cmp, initialsOf, nf, norm } from "@/lib/domain/text";
import type { PublicBook, PublicOwner } from "@/lib/domain/types";
import type { Theme } from "@/lib/theme";

import { PublicBookDialog, PublicDrawDialog } from "./public-book-dialog";
import { PublicCover } from "./public-cover";

const PAGE = 48;

type Viewer = "anon" | "owner" | "other";

interface GenreOption {
  label: string;
  value: string;
}

const STATUS_OPTIONS: readonly (readonly [PublicStatus | "", string])[] = [
  ["", "Todos"],
  ...PUBLIC_STATUSES.map((k) => [k, STATUS_TAB[k]] as const),
];

const outline =
  "h-11 whitespace-nowrap rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm transition-[border-color] duration-150 hover:border-ink";
const link =
  "border-0 bg-transparent p-0 font-semibold text-acc text-sm hover:text-acc2 hover:underline";

function Header({ viewer, theme }: { viewer: Viewer; theme: Theme }) {
  return (
    <header className="border-line border-b bg-hdr">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-3 px-7 py-3 max-[640px]:px-4">
        <Link
          className="flex min-w-0 flex-1 items-center gap-3 text-ink no-underline hover:text-ink"
          href="/"
        >
          <BrandMark />
          <BrandWordmark />
        </Link>
        <ThemeToggle className="flex-none" initial={theme} />
        {viewer === "anon" ? (
          <Link
            className="flex h-10 flex-none items-center whitespace-nowrap rounded-lg bg-acc px-4 font-semibold text-onacc text-sm no-underline hover:bg-acc2 hover:text-onacc"
            href="/entrar?modo=cadastro"
          >
            Criar minha estante
          </Link>
        ) : null}
        {viewer === "other" ? (
          <Link
            className="flex h-10 flex-none items-center whitespace-nowrap rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm no-underline hover:border-ink hover:text-ink"
            href="/"
          >
            Ir para meu acervo
          </Link>
        ) : null}
      </div>
    </header>
  );
}

/** Estante pública em modo leitura: busca, filtros, ficha, sorteio e links. */
export function PublicShelf({
  books,
  owner,
  slug,
  initial,
  origin,
  viewer,
  theme,
}: {
  books: PublicBook[];
  owner: PublicOwner;
  slug: string;
  initial: PublicSelection;
  origin: string;
  viewer: Viewer;
  theme: Theme;
}) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(initial.genre);
  const [status, setStatus] = useState<PublicStatus | "">(initial.status);
  const [limit, setLimit] = useState(PAGE);
  const [bookId, setBookId] = useState(initial.bookId);
  const [drawId, setDrawId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedBook, setCopiedBook] = useState(false);

  const first = firstName(owner.name);
  const list = useMemo(
    () => filterPublicBooks(books, { q, genre, status }),
    [books, q, genre, status]
  );
  const genreOptions = useMemo<GenreOption[]>(
    () => [
      { value: "", label: "Todos os gêneros" },
      ...genreCounts(books)
        .sort((a, b) => cmp(a.label, b.label))
        .map((g) => ({ value: g.slug, label: g.label + " (" + g.count + ")" })),
    ],
    [books]
  );
  const selectedGenre =
    genreOptions.find((o) => o.value === genre) ?? genreOptions[0];
  const notice = useMemo(
    () => sharedNotice(owner.name, initial, books),
    [owner.name, initial, books]
  );
  const filtered = !!(genre || status || q);
  const shown = list.slice(0, limit);
  const book = bookId ? (books.find((b) => b.id === bookId) ?? null) : null;
  const drawn = drawId ? (books.find((b) => b.id === drawId) ?? null) : null;

  /** Toda mudança de filtro volta aos primeiros 48 e "descopia" o link. */
  const change = (fn: () => void) => {
    fn();
    setLimit(PAGE);
    setCopied(false);
  };
  const clear = () =>
    change(() => {
      setQ("");
      setGenre("");
      setStatus("");
    });
  const draw = () => setDrawId(drawBook(list, drawId)?.id ?? null);
  const abs = (sel: Partial<PublicSelection>) => origin + publicPath(slug, sel);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      {viewer === "owner" ? (
        <div className="bg-ink text-card" role="status">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-7 py-2.5 max-[640px]:px-4">
            <span className="min-w-0 flex-[1_1_280px] text-pretty text-sm leading-5">
              <strong className="font-semibold">Modo visitante.</strong> É assim
              que quem recebe este link vê sua estante.
            </span>
            <Link
              className="flex h-9 items-center rounded-lg border border-current px-3.5 font-semibold text-card text-sm no-underline hover:text-card"
              href="/estante"
            >
              Voltar ao acervo
            </Link>
          </div>
        </div>
      ) : null}
      <Header theme={theme} viewer={viewer} />

      <main
        className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-7 pt-8 pb-16 max-[640px]:px-4"
        id="conteudo-principal"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar
              className="size-14 font-bold text-lg"
              image={owner.image}
              initials={initialsOf(owner.name)}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold text-acc text-xs uppercase tracking-[.1em]">
                Estante de
              </span>
              <h1 className="m-0 text-balance font-bold font-title text-[34px] leading-[1.1] tracking-[-0.01em]">
                {owner.name}
              </h1>
              <span className="text-mute text-sm">
                {list.length === books.length
                  ? booksLabel(books.length)
                  : nf(list.length) + " de " + booksLabel(books.length)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {list.length > 0 ? (
              <button
                className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border-0 bg-acc px-[18px] font-semibold text-onacc text-sm transition-[background-color,transform] duration-150 hover:bg-acc2 active:scale-[.97]"
                onClick={draw}
                type="button"
              >
                <ShuffleIcon aria-hidden="true" className="size-4" />
                Sortear para mim
              </button>
            ) : null}
            <button
              className={outline}
              onClick={() =>
                void copyText(abs({ genre, status })).then(setCopied)
              }
              type="button"
            >
              {copied ? "Link copiado ✓" : "Copiar link"}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="flex animate-[acv-fade_300ms_both] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-card px-4 py-3">
            <span
              aria-hidden="true"
              className="size-2 flex-none rounded-full bg-ouro"
            />
            <span className="min-w-0 flex-[1_1_240px] text-pretty text-sm leading-5">
              {notice}
            </span>
            {filtered ? (
              <button className={link} onClick={clear} type="button">
                Ver estante completa
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <input
            aria-label="Buscar título ou autor"
            className="h-10 min-w-0 max-w-[320px] flex-[1_1_220px] rounded-lg border border-line2 bg-card px-4 text-ink text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink focus:shadow-ring max-[640px]:max-w-none max-[640px]:flex-[1_1_100%]"
            onChange={(e) => change(() => setQ(e.target.value))}
            placeholder="Buscar título ou autor"
            value={q}
          />
          <div className="min-w-[180px] flex-[0_1_240px] max-[640px]:flex-[1_1_100%]">
            <Combobox<GenreOption>
              filter={(o, query) => norm(o.label).includes(norm(query))}
              isItemEqualToValue={(a, b) => a.value === b.value}
              items={genreOptions}
              itemToStringLabel={(o) => o.label}
              onValueChange={(o) => {
                if (o && o.value !== genre) {
                  change(() => setGenre(o.value));
                }
              }}
              value={selectedGenre}
            >
              <ComboboxField
                aria-label="Gênero"
                className="h-10"
                triggerLabel="Mostrar gêneros"
              />
              <ComboboxContent>
                <ComboboxEmpty>Nenhum gênero encontrado.</ComboboxEmpty>
                <ComboboxList>
                  {(o: GenreOption) => (
                    <ComboboxItem key={o.value} value={o}>
                      {o.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <Segmented<PublicStatus | "">
            className="flex-wrap rounded-lg p-1"
            itemClassName="h-8 rounded-md px-3 text-sm whitespace-nowrap"
            label="Status"
            onChange={(k) => change(() => setStatus(k))}
            options={STATUS_OPTIONS}
            value={status}
          />
          {filtered ? (
            <button
              className="h-10 border-0 bg-transparent px-1 font-semibold text-mute text-sm hover:text-ink"
              onClick={clear}
              type="button"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-card px-5 py-16 text-center">
            <span className="font-semibold text-lg">
              Nenhum livro nesta seleção
            </span>
            <span className="text-mute text-sm">
              Tente outro gênero, status ou busca.
            </span>
            <button
              className="mt-3 h-10 rounded-lg border border-ink bg-transparent px-4 font-semibold text-ink text-sm transition-[background-color,color] duration-200 hover:bg-ink hover:text-card"
              onClick={clear}
              type="button"
            >
              Ver estante completa
            </button>
          </div>
        ) : (
          <ul
            aria-label="Livros"
            className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-7 p-0 max-[641px]:grid-cols-2 max-[641px]:gap-x-3"
          >
            {shown.map((b) => {
              const s = stat(b.status);
              return (
                <li className="min-w-0" key={b.id}>
                  <button
                    className="flex w-full animate-acv-in cursor-pointer flex-col gap-3 border-0 bg-transparent p-0 text-left text-ink"
                    onClick={() => {
                      setCopiedBook(false);
                      setBookId(b.id);
                    }}
                    type="button"
                  >
                    <PublicCover book={b} />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-pretty break-words font-semibold text-sm leading-[1.25]">
                        {b.title}
                      </span>
                      <span className="break-words text-mute text-xs">
                        {b.author || "Autor desconhecido"}
                      </span>
                      <span className="flex items-center gap-1.5 text-mute text-xs">
                        <span
                          aria-hidden="true"
                          className="size-[7px] rounded-full"
                          style={{ background: s.dot }}
                        />
                        {s.label}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > shown.length ? (
          <button
            className="h-10 self-center rounded-lg border border-ink bg-transparent px-5 font-semibold text-ink text-sm transition-[background-color,color] duration-200 hover:bg-ink hover:text-card"
            onClick={() => setLimit((n) => n + PAGE)}
            type="button"
          >
            {"Mostrar mais " +
              Math.min(PAGE, list.length - shown.length) +
              " livros"}
          </button>
        ) : null}
      </main>

      <footer className="border-line border-t">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-7 py-5 text-[13px] text-mute max-[640px]:px-4">
          <span>Estante publicada com Bodega Literária</span>
          {viewer === "anon" ? (
            <Link
              className="font-semibold text-acc no-underline hover:text-acc2 hover:underline"
              href="/entrar?modo=cadastro"
            >
              Catalogue a sua também →
            </Link>
          ) : null}
        </div>
      </footer>

      <PublicBookDialog
        book={book}
        copied={copiedBook}
        onByAuthor={() => {
          const author = book?.author ?? "";
          setBookId("");
          change(() => {
            setQ(author);
            setGenre("");
            setStatus("");
          });
        }}
        onClose={() => setBookId("")}
        onCopy={() =>
          book && void copyText(abs({ bookId: book.id })).then(setCopiedBook)
        }
        ownerFirstName={first}
      />
      <PublicDrawDialog
        book={drawn}
        onAgain={draw}
        onClose={() => setDrawId(null)}
        onOpen={() => {
          const id = drawId ?? "";
          setDrawId(null);
          setCopiedBook(false);
          setBookId(id);
        }}
        poolLabel={drawPoolLabel(list.length, filtered)}
      />
    </div>
  );
}
