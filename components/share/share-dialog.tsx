"use client";

import { cn } from "cn";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { toast } from "@/components/app/toast";
import { MiniCover } from "@/components/books/mini-cover";
import { ComboboxField } from "@/components/custom/combobox-field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useBooks } from "@/hooks/use-books";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { api } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { readingInfo } from "@/lib/domain/book-state";
import {
  genreCounts,
  ogFor,
  PUBLIC_READINGS,
  type PublicReading,
  publicPath,
  READING_TAB,
  type ShareKind,
  type ShareScope,
  selectionOf,
  shareTargets,
  toPublicBooks,
} from "@/lib/domain/share";
import { cmp, norm } from "@/lib/domain/text";

import { ScaledOgCard } from "./scaled-og-card";

const KINDS: readonly (readonly [ShareKind, string])[] = [
  ["todos", "Estante toda"],
  ["genero", "Um gênero"],
  ["leitura", "Uma leitura"],
  ["livro", "Um livro"],
];

interface GenreOption {
  label: string;
  value: string;
}

const label = "font-medium text-mute text-xs";
const primary =
  "h-11 flex-none whitespace-nowrap rounded-lg border-0 bg-acc px-[18px] font-semibold text-onacc text-sm transition-[background-color,transform] duration-150 hover:bg-acc2 active:scale-[.97] disabled:opacity-60";
const textButton =
  "border-0 bg-transparent p-0 font-semibold text-acc text-sm hover:text-acc2 hover:underline disabled:opacity-60";

function ShareBody() {
  const app = useApp();
  const ownBooks = useBooks();
  const books = useMemo(() => toPublicBooks(ownBooks), [ownBooks]);
  const genres = useMemo(
    () =>
      genreCounts(books).sort(
        (a, b) => b.count - a.count || cmp(a.label, b.label)
      ),
    [books]
  );
  const byTitle = useMemo(
    () => [...books].sort((a, b) => cmp(a.title, b.title)),
    [books]
  );
  const start = app.shareScope ?? { kind: "todos" };
  const [scope, setScope] = useState<Required<ShareScope>>(() => ({
    kind: start.kind,
    genre: start.genre ?? genres[0]?.slug ?? "",
    reading: start.reading ?? "lido",
    bookId: start.bookId ?? byTitle[0]?.id ?? "",
  }));
  const [bookQ, setBookQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const genreId = useId();
  const once = useSingleFlight();
  const [saving, setSaving] = useState(false);

  // `navigator.share` só existe no navegador: checado depois de montar (sem divergir do SSR).
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const update = (patch: Partial<ShareScope>) => {
    setScope((s) => ({ ...s, ...patch }));
    setCopied(false);
  };

  const { slug, enabled } = app.publicShelf;
  const sel = selectionOf(scope);
  const og = ogFor(books, app.user.name, sel);
  const url = app.origin + publicPath(slug ?? "", sel);
  const host = new URL(app.origin).host;
  const bq = norm(bookQ);
  const matches = (
    bq
      ? byTitle.filter((b) =>
          norm(b.title + " " + (b.author ?? "")).includes(bq)
        )
      : [...byTitle].sort(
          (a, b) =>
            Number(b.id === scope.bookId) - Number(a.id === scope.bookId)
        )
  ).slice(0, 5);
  const genreOptions: GenreOption[] = genres.map((g) => ({
    value: g.slug,
    label: g.label + " (" + g.count + ")",
  }));

  const publish = (next: boolean) =>
    once(async () => {
      setSaving(true);
      try {
        const state = await api.put<{ enabled: boolean; slug: string }>(
          "/api/public-shelf",
          { enabled: next }
        );
        app.setPublicShelf(state);
        toast(next ? "Estante publicada" : "Sua estante voltou a ser privada", {
          type: next ? "success" : "info",
          note: next
            ? "Quem tiver o link vê a estante em modo leitura."
            : "Os links compartilhados deixam de abrir.",
        });
      } catch (e) {
        toast((e as Error).message, { type: "error" });
      } finally {
        setSaving(false);
      }
    });

  return (
    <div
      className="flex flex-col gap-5 px-7 py-6 max-[640px]:p-5"
      ref={panelRef}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-acc text-xs uppercase tracking-[.1em]">
            Compartilhar
          </span>
          <h2 className="m-0 font-bold font-title text-2xl leading-[1.15]">
            Mostre sua estante
          </h2>
        </div>
        <ModalClose />
      </div>
      <p className="m-0 text-pretty text-mute text-sm leading-[1.55]">
        Quem abrir o link vê sua estante em modo leitura, já com o filtro
        escolhido. O filtro é só o ponto de partida: dá para removê-lo e ver o
        resto do acervo, e também sortear um livro.
      </p>

      {app.user.emailVerified ? null : (
        <div
          className="rounded-xl border border-line bg-hov p-4 text-sm leading-[1.55]"
          role="status"
        >
          <strong className="font-semibold">
            Confirme seu e-mail para publicar sua estante.
          </strong>{" "}
          Use o aviso no topo da página para reenviar a confirmação.
        </div>
      )}

      {app.user.emailVerified ? (
        <>
          <div className="flex flex-col gap-2">
            <span className={label}>O que enviar</span>
            <Segmented<ShareKind>
              className="flex-wrap rounded-lg p-1"
              itemClassName="h-9 flex-[1_1_auto] rounded-md px-3 text-sm whitespace-nowrap"
              label="O que enviar"
              onChange={(kind) => update({ kind })}
              options={KINDS}
              value={scope.kind}
            />
          </div>

          {scope.kind === "genero" ? (
            <div className="flex flex-col gap-2">
              <label className={label} htmlFor={genreId}>
                Gênero
              </label>
              {genreOptions.length ? (
                <Combobox<GenreOption>
                  filter={(o, query) => norm(o.label).includes(norm(query))}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                  items={genreOptions}
                  itemToStringLabel={(o) => o.label}
                  onValueChange={(o) => o && update({ genre: o.value })}
                  value={
                    genreOptions.find((o) => o.value === scope.genre) ?? null
                  }
                >
                  <ComboboxField
                    className="h-10"
                    id={genreId}
                    triggerLabel="Mostrar gêneros"
                  />
                  <ComboboxContent container={panelRef}>
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
              ) : (
                <span className="text-mute text-sm" id={genreId}>
                  Cadastre o gênero na ficha dos livros para compartilhar por
                  gênero.
                </span>
              )}
            </div>
          ) : null}

          {scope.kind === "leitura" ? (
            <div className="flex flex-wrap gap-2">
              {PUBLIC_READINGS.map((k: PublicReading) => {
                const on = scope.reading === k;
                return (
                  <button
                    aria-pressed={on}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full border px-3 font-medium text-sm transition-[background-color,color,border-color] duration-200 active:scale-95",
                      on
                        ? "border-ink bg-ink text-card"
                        : "border-line2 bg-card text-ink"
                    )}
                    key={k}
                    onClick={() => update({ reading: k })}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block size-2 rounded-full"
                      style={{ background: readingInfo(k).dot }}
                    />
                    <span>{READING_TAB[k]}</span>
                    <span className="tabular-nums">
                      {books.filter((b) => b.reading === k).length}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {scope.kind === "livro" ? (
            <div className="flex flex-col gap-2">
              <input
                aria-label="Buscar livro por título ou autor"
                className="h-10 rounded-lg border border-line2 bg-card px-3 text-ink text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink focus:shadow-ring"
                onChange={(e) => setBookQ(e.target.value)}
                placeholder="Buscar livro por título ou autor"
                value={bookQ}
              />
              <div
                aria-label="Livros"
                className="flex flex-col gap-0.5"
                role="listbox"
              >
                {matches.map((b) => {
                  const on = b.id === scope.bookId;
                  return (
                    <button
                      aria-selected={on}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-lg border-0 px-2 py-1.5 text-left text-ink hover:bg-seg",
                        on ? "bg-seg" : "bg-transparent"
                      )}
                      key={b.id}
                      onClick={() => update({ bookId: b.id })}
                      role="option"
                      type="button"
                    >
                      <MiniCover
                        book={b}
                        className="h-11 w-[30px] rounded-[3px] text-xs"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-sm">
                          {b.title}
                        </span>
                        <span className="truncate text-mute text-xs">
                          {b.author || "—"}
                        </span>
                      </span>
                      <span aria-hidden="true" className="w-4 text-acc">
                        {on ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
                {matches.length ? null : (
                  <span className="px-2 py-3 text-mute text-sm">
                    Nenhum livro encontrado.
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className={label}>Prévia nas redes</span>
            <div className="overflow-hidden rounded-xl border border-line2 bg-card">
              <ScaledOgCard og={og} />
              <div className="flex flex-col gap-0.5 bg-soft px-4 py-3">
                <span className="text-mute text-xs uppercase tracking-[.05em]">
                  {host}
                </span>
                <span className="font-semibold text-sm leading-[1.3]">
                  {og.title}
                </span>
                <span className="text-pretty text-[13px] text-mute leading-[1.4]">
                  {og.description}
                </span>
              </div>
            </div>
          </div>

          {enabled && slug ? (
            <>
              <div className="flex gap-2">
                <input
                  aria-label="Link da estante"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-line2 bg-bg px-3 text-ink text-sm outline-none focus:border-ink"
                  onFocus={(e) => e.currentTarget.select()}
                  readOnly
                  value={url}
                />
                <button
                  className={primary}
                  onClick={() =>
                    void copyText(url).then((ok) => {
                      if (!ok) {
                        return toast("Não foi possível copiar o link", {
                          type: "error",
                        });
                      }
                      setCopied(true);
                      toast("Link copiado", {
                        note: "Cole em qualquer conversa ou rede social.",
                      });
                    })
                  }
                  type="button"
                >
                  {copied ? "Copiado ✓" : "Copiar link"}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <span className={label}>Enviar por</span>
                <div className="grid grid-cols-3 gap-2 max-[480px]:grid-cols-2">
                  {shareTargets(url, og).map((t) => {
                    const mail = t.href.startsWith("mailto:");
                    return (
                      <a
                        className="flex h-10 items-center justify-center rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm no-underline transition-[border-color] duration-150 hover:border-ink hover:text-ink"
                        href={t.href}
                        key={t.label}
                        rel={mail ? undefined : "noopener noreferrer"}
                        target={mail ? undefined : "_blank"}
                      >
                        {t.label}
                      </a>
                    );
                  })}
                  {canShare ? (
                    <button
                      className="col-span-full h-10 rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm transition-[border-color] duration-150 hover:border-ink"
                      onClick={() =>
                        navigator
                          .share({ title: og.title, text: og.description, url })
                          .catch(() => undefined)
                      }
                      type="button"
                    >
                      Mais opções…
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-line border-t pt-4">
                <span className="text-mute text-xs leading-[1.5]">
                  Anotações e nomes de quem pegou livro emprestado não aparecem.
                </span>
                <Link
                  className="font-semibold text-acc text-sm no-underline hover:text-acc2 hover:underline"
                  href={publicPath(slug, sel)}
                  onClick={app.closeShare}
                >
                  Ver como visitante →
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-mute text-xs">
                <span>Sua estante está pública.</span>
                <button
                  className={textButton + "text-xs"}
                  disabled={saving}
                  onClick={() => publish(false)}
                  type="button"
                >
                  Tornar privada
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-hov p-4">
              <p className="m-0 min-w-0 flex-[1_1_260px] text-pretty text-sm leading-[1.55]">
                <strong className="font-semibold">
                  Sua estante ainda é privada.
                </strong>{" "}
                Ao publicar, quem tiver o link vê capa, título, autor, gênero,
                páginas, editora, ano e status. Anotações, empréstimos, data de
                aquisição e livros doados nunca aparecem.
              </p>
              <button
                className={primary}
                disabled={saving}
                onClick={() => publish(true)}
                type="button"
              >
                Publicar estante
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export function ShareDialog() {
  const app = useApp();
  return (
    <Modal
      className="max-w-[560px]"
      onOpenChange={(o) => !o && app.closeShare()}
      open={!!app.shareScope}
      title="Compartilhar"
      veilClassName="z-[35] py-[60px] max-[640px]:px-3 max-[640px]:py-4"
    >
      {app.shareScope ? <ShareBody /> : null}
    </Modal>
  );
}
