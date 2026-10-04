"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { useMemo, useRef, useState } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";

import { useApp } from "@/components/app/app-provider";
import { toast } from "@/components/app/toast";
import {
  Modal,
  ModalClose,
  useModalClose,
  useModalDraft,
} from "@/components/ui/dialog";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import { useSingleFlight } from "@/hooks/use-single-flight";
import { searchCatalogs } from "@/lib/client/lookup";
import { coverColors, coverImage } from "@/lib/domain/cover";
import { GENRES, suggestions } from "@/lib/domain/genres";
import type { LookupResult } from "@/lib/domain/lookup";
import { STATUS, stat } from "@/lib/domain/status";
import { capitalize, fmtDate, nf } from "@/lib/domain/text";
import { BOOK_STATUSES, type Book, type BookStatus } from "@/lib/domain/types";
import {
  type BookFormOutput,
  type BookFormValues,
  bookFormSchema,
} from "@/lib/validation/book";

// --- Peças compartilhadas ----------------------------------------------------

/** Painel da capa (esquerda no desktop, linha no topo abaixo de 640px). */
function CoverPanel({
  title,
  author,
  coverUrl,
  hint,
  edit,
}: {
  title: string;
  author: string;
  coverUrl: string | null;
  hint: string;
  edit?: boolean;
}) {
  const { coverBg, coverInk } = coverColors(title, author);
  return (
    <div
      className={cn(
        "flex max-w-full flex-[0_0_240px] flex-col items-stretch gap-3 bg-card p-6",
        "max-[640px]:flex-[1_1_100%] max-[640px]:flex-row max-[640px]:items-center max-[640px]:gap-[14px]",
        edit
          ? "max-[640px]:px-[18px] max-[640px]:py-0"
          : "max-[640px]:px-[18px] max-[640px]:py-4"
      )}
    >
      <div
        className={cn(
          "relative flex aspect-[2/3] w-full flex-none flex-col justify-between overflow-hidden rounded-md px-[14px] py-4 shadow-lift",
          "max-[640px]:w-[84px] max-[640px]:px-[7px] max-[640px]:py-2"
        )}
        style={{ background: coverBg, color: coverInk }}
      >
        <span
          className={cn(
            "font-semibold text-[10px] uppercase tracking-[.1em] opacity-80",
            "max-[640px]:text-[6px]"
          )}
        >
          {author}
        </span>
        <span
          className={cn(
            "font-bold text-[22px] leading-[1.08]",
            "max-[640px]:text-xs"
          )}
        >
          {title}
        </span>
        <span
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: coverImage(coverUrl) }}
        />
      </div>
      <span className="text-mute text-xs leading-[1.5]">{hint}</span>
    </div>
  );
}

/** Excluir em dois cliques ("Excluir livro" → "Confirmar exclusão"). */
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      className="-ml-3 h-9 rounded-lg border-0 bg-transparent px-3 font-semibold text-acc text-sm hover:bg-hov"
      onClick={() => (confirm ? onConfirm() : setConfirm(true))}
      type="button"
    >
      {confirm ? "Confirmar exclusão" : "Excluir livro"}
    </button>
  );
}

function useDelete() {
  const app = useApp();
  const { remove } = useBookActions();
  return (book: Book) => {
    app.closeModal();
    void remove(book.id).then((ok) => ok && toast("Livro excluído"));
  };
}

// --- Ficha (visualizar) ------------------------------------------------------

function ViewModal({ book }: { book: Book }) {
  const app = useApp();
  const { goShelf } = useShelfState();
  const del = useDelete();
  const author = book.author || "Autor desconhecido";
  const rows: [string, string | number | null][] = [
    ["Editora", book.publisher],
    ["Gênero da obra", book.genre],
    ["Páginas", book.pages ? nf(book.pages) : ""],
    ["Nacionalidade", book.nationality ? capitalize(book.nationality) : ""],
    ["Gênero do autor(a)", book.authorGender],
    ["Cor/etnia do autor(a)", book.authorEthnicity],
    ["Ano de lançamento", book.yearPublished],
    ["Data de aquisição", book.acquiredOn ? fmtDate(book.acquiredOn) : ""],
    ["Ano em que foi lido", book.yearRead],
  ];
  return (
    <div className="flex flex-wrap">
      <CoverPanel
        author={author}
        coverUrl={book.coverUrl}
        hint={
          book.acquiredOn
            ? "No acervo desde " + fmtDate(book.acquiredOn) + "."
            : ""
        }
        title={book.title}
      />
      <div
        className={cn(
          "flex min-w-0 flex-[1_1_400px] flex-col gap-5 px-[26px] py-6",
          "max-[640px]:px-[18px] max-[640px]:py-5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold text-mute text-xs tabular-nums">
              {book.orderNo ? "Nº " + book.orderNo + " do acervo" : ""}
            </span>
            <h2 className="m-0 text-balance font-bold text-2xl leading-[1.15] tracking-[-.025em]">
              {book.title}
            </h2>
            <button
              className="self-start border-0 bg-transparent p-0 text-base text-mute hover:text-acc hover:underline"
              onClick={() => {
                app.closeModal();
                goShelf({ facet: { kind: "autor", value: author } });
              }}
              title="Ver todos os livros deste autor"
              type="button"
            >
              {author}
            </button>
          </div>
          <ModalClose />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Status"
            className="h-9 cursor-pointer rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-sm"
            onChange={(e) => app.setStatus(book, e.target.value as BookStatus)}
            value={book.status}
          >
            {STATUS.map((s) => (
              <option key={s.k} value={s.k}>
                {s.label}
              </option>
            ))}
          </select>
          {book.status === "emprestado" && book.borrower ? (
            <span className="rounded-full bg-lentbg px-3 py-1 font-semibold text-lentfg text-sm">
              Emprestado para {book.borrower}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] gap-x-5 gap-y-4 border-soft border-y py-4">
          {rows.map(([label, value]) => (
            <div className="flex min-w-0 flex-col gap-1" key={label}>
              <span className="font-semibold text-mute text-xs uppercase tracking-[.05em]">
                {label}
              </span>
              <span className="font-medium text-sm [overflow-wrap:anywhere]">
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-mute text-xs uppercase tracking-[.05em]">
            Anotações pessoais
          </span>
          <div className="whitespace-pre-wrap rounded-xl bg-hov p-4 text-ink text-sm leading-[1.6]">
            {book.notes || "Sem anotações."}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DeleteButton onConfirm={() => del(book)} />
          <button
            className="h-10 rounded-lg border-0 bg-ink px-5 font-semibold text-card text-sm hover:bg-acc"
            onClick={() => app.openEdit(book.id)}
            type="button"
          >
            Editar ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Registrar / editar -------------------------------------------------------

const str = (v: string | number | null | undefined) =>
  v == null ? "" : String(v);

function toFormValues(b: Book | null, orderNo: number): BookFormValues {
  return {
    orderNo: str(b ? b.orderNo : orderNo),
    title: b?.title ?? "",
    author: str(b?.author),
    authorGender: b?.authorGender ?? "",
    authorEthnicity: str(b?.authorEthnicity),
    nationality: str(b?.nationality),
    publisher: str(b?.publisher),
    genre: str(b?.genre),
    yearPublished: str(b?.yearPublished),
    pages: str(b?.pages),
    acquiredOn: str(b?.acquiredOn),
    status: b?.status ?? "nao-lido",
    borrower: str(b?.borrower),
    yearRead: str(b?.yearRead),
    notes: str(b?.notes),
    coverUrl: str(b?.coverUrl),
  };
}

const fieldInput =
  "h-10 w-full min-w-0 rounded-lg border border-line2 bg-card px-3 text-sm text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink aria-invalid:border-acc";

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-2 font-medium text-mute text-xs",
        className
      )}
    >
      {label}
      {children}
      {error ? (
        <span className="font-normal text-acc text-xs" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function OnlineSearch({
  form,
}: {
  form: UseFormReturn<BookFormValues, unknown, BookFormOutput>;
}) {
  const [sq, setSq] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<LookupResult[] | null>(null);
  // Só a busca mais recente pode preencher os resultados.
  const searchId = useRef(0);

  async function run() {
    if (loading) {
      return;
    }
    const q = sq.trim() || form.getValues("title").trim();
    if (!q) {
      return setMsg("Digite um título ou ISBN.");
    }
    const id = ++searchId.current;
    setLoading(true);
    setMsg("");
    setResults(null);
    const { results, failed } = await searchCatalogs(q);
    if (id !== searchId.current) {
      return;
    }
    setLoading(false);
    setResults(results);
    setMsg(
      failed
        ? "Não foi possível consultar os catálogos. Verifique a conexão."
        : results.length
          ? ""
          : "Nenhum resultado encontrado."
    );
  }

  function pick(r: LookupResult) {
    const set = (k: keyof BookFormValues, v: string) =>
      v && form.setValue(k, v, { shouldDirty: true, shouldValidate: true });
    if (r.coverOnly) {
      set("coverUrl", r.cover);
    } else {
      set("title", r.title);
      set("author", r.author);
      set("publisher", r.publisher);
      set("yearPublished", r.year);
      set("pages", r.pages);
      set("coverUrl", r.cover);
    }
    setResults(null);
    setMsg(
      "Dados preenchidos a partir de " + r.source + ". Revise antes de salvar."
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-hov p-4">
      <span className="font-semibold text-mute text-xs">
        Buscar online por título ou ISBN · Google Livros, Apple Books, Open
        Library e Amazon (ISBN)
      </span>
      <div className="flex gap-2">
        <input
          aria-label="Buscar online"
          className={cn(fieldInput, "flex-1")}
          onChange={(e) => setSq(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="ex.: Torto arado ou 9788554512348"
          value={sq}
        />
        <button
          className="h-10 flex-none rounded-lg border-0 bg-ink px-4 font-semibold text-card text-sm hover:bg-acc disabled:cursor-wait disabled:opacity-60"
          disabled={loading}
          onClick={() => void run()}
          type="button"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {msg ? <span className="text-mute text-xs">{msg}</span> : null}
      {results?.length ? (
        <div className="-mx-2 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
          {results.map((r, i) => (
            <button
              className="flex items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-card"
              key={i}
              onClick={() => pick(r)}
              type="button"
            >
              <span className="relative h-12 w-8 flex-none overflow-hidden rounded bg-soft">
                <span
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: coverImage(r.cover) }}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate font-semibold text-sm">
                  {r.title}
                </span>
                <span className="truncate text-mute text-xs">
                  {r.author || "—"}
                </span>
                <span className="text-mute text-xs">
                  {[
                    r.publisher,
                    r.year,
                    r.pages ? r.pages + " p." : "",
                    r.source,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EditModal({ book }: { book: Book | null }) {
  const app = useApp();
  const books = useBooks();
  const { create, update } = useBookActions();
  const del = useDelete();
  const nextOrder = useMemo(
    () => Math.max(0, ...books.map((b) => b.orderNo || 0)) + 1,
    [books]
  );
  const form = useForm<BookFormValues, unknown, BookFormOutput>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: toFormValues(book, nextOrder),
  });
  const { register, formState, setValue } = form;
  const requestClose = useModalClose();
  const submitOnce = useSingleFlight();
  useModalDraft(formState.isDirty);
  const [title, author, coverUrl, status] = useWatch({
    control: form.control,
    name: ["title", "author", "coverUrl", "status"],
  });
  const lists = useMemo(
    () => ({
      genres: suggestions(
        books.map((b) => b.genre),
        GENRES
      ),
      nationalities: suggestions(books.map((b) => b.nationality)),
      ethnicities: suggestions(books.map((b) => b.authorEthnicity)),
    }),
    [books]
  );
  const modalTitle = book ? "Editar ficha" : "Registrar livro";
  const err = (k: keyof BookFormValues) => formState.errors[k]?.message;

  const onSubmit = form.handleSubmit((values) =>
    submitOnce(async () => {
      // Na falha o toast de erro já apareceu; o modal fica aberto com o que foi digitado.
      if (book) {
        if (!(await update(book.id, values))) {
          return;
        }
        toast("Alterações salvas");
      } else {
        try {
          await create(values);
        } catch {
          return;
        }
        toast("Livro registrado no acervo");
      }
      app.closeModal();
    })
  );

  return (
    <form className="flex flex-wrap" noValidate onSubmit={onSubmit}>
      <div
        className={cn(
          "hidden flex-[1_1_100%] items-center justify-between gap-3 px-5 pt-5 pb-4",
          "max-[640px]:flex"
        )}
      >
        <h2 className="m-0 font-bold text-xl">{modalTitle}</h2>
        <ModalClose />
      </div>
      <CoverPanel
        author={author || "Autor"}
        coverUrl={coverUrl || null}
        edit
        hint={
          book && book.acquiredOn
            ? "No acervo desde " + fmtDate(book.acquiredOn) + "."
            : "Sem imagem, a capa é gerada a partir do título e do autor."
        }
        title={title || "Título do livro"}
      />
      <div
        className={cn(
          "flex min-w-0 flex-[1_1_420px] flex-col gap-5 px-[26px] py-6",
          "max-[640px]:px-[18px] max-[640px]:py-5"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            "max-[640px]:hidden"
          )}
        >
          <h2 className="m-0 font-bold text-xl">{modalTitle}</h2>
          <ModalClose />
        </div>

        <OnlineSearch form={form} />

        <div
          className={cn("grid grid-cols-3 gap-4", "max-[640px]:grid-cols-2")}
        >
          <Field
            className="col-span-full"
            error={err("title")}
            label="Título *"
          >
            <input
              {...register("title")}
              aria-invalid={!!err("title")}
              className={cn(fieldInput, "h-11 font-semibold text-base")}
            />
          </Field>
          <Field
            className="col-span-2"
            error={err("author")}
            label="Autor(a) (opcional)"
          >
            <input {...register("author")} className={fieldInput} />
          </Field>
          <Field label="Gênero do autor(a)">
            <select
              {...register("authorGender")}
              className={cn(fieldInput, "px-3")}
            >
              <option value="">—</option>
              <option value="Homem">Homem</option>
              <option value="Mulher">Mulher</option>
              <option value="Não definido">Não definido</option>
            </select>
          </Field>
          <Field error={err("publisher")} label="Editora">
            <input {...register("publisher")} className={fieldInput} />
          </Field>
          <Field error={err("nationality")} label="Nacionalidade do autor">
            <input
              {...register("nationality")}
              className={fieldInput}
              list="nacionalidades"
              placeholder="ex.: brasileira"
            />
          </Field>
          <Field error={err("authorEthnicity")} label="Cor/etnia do autor(a)">
            <input
              {...register("authorEthnicity")}
              className={fieldInput}
              list="etnias"
              placeholder="ex.: parda"
            />
          </Field>
          <Field error={err("genre")} label="Gênero da obra">
            <input
              {...register("genre")}
              className={fieldInput}
              list="generos"
              placeholder="ex.: Romance"
            />
          </Field>
          <Field error={err("yearPublished")} label="Ano de lançamento">
            <input
              {...register("yearPublished")}
              className={fieldInput}
              placeholder="ex.: 1949"
              type="number"
            />
          </Field>
          <Field error={err("pages")} label="Páginas">
            <input
              {...register("pages")}
              className={fieldInput}
              placeholder="ex.: 416"
              type="number"
            />
          </Field>
          <Field error={err("acquiredOn")} label="Data de aquisição">
            <input
              {...register("acquiredOn")}
              className={fieldInput}
              type="date"
            />
          </Field>
          <Field error={err("yearRead")} label="Ano em que foi lido">
            <input
              {...register("yearRead")}
              className={fieldInput}
              placeholder={"ex.: " + app.year}
              type="number"
            />
          </Field>
          <Field error={err("orderNo")} label="Nº de ordem">
            <input
              {...register("orderNo")}
              className={fieldInput}
              type="number"
            />
          </Field>
          <Field
            className="col-span-full"
            error={err("coverUrl")}
            label="Capa (link da imagem)"
          >
            <input
              {...register("coverUrl")}
              className={fieldInput}
              placeholder="https://… (preenchido pela busca online)"
            />
          </Field>
          <div className="col-span-full flex flex-col gap-2 font-medium text-mute text-xs">
            Status no acervo
            <div
              aria-label="Status no acervo"
              className="flex flex-wrap gap-2"
              role="radiogroup"
            >
              {BOOK_STATUSES.map((k) => {
                const s = stat(k);
                const on = status === k;
                return (
                  <button
                    aria-checked={on}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-full border px-3 font-medium text-sm active:scale-95",
                      on
                        ? "border-ink bg-ink text-card"
                        : "border-line2 bg-card text-ink"
                    )}
                    key={k}
                    onClick={() => {
                      setValue("status", k, { shouldDirty: true });
                      if (k === "lido" && !form.getValues("yearRead")) {
                        setValue("yearRead", String(app.year));
                      }
                    }}
                    role="radio"
                    type="button"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: s.dot }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          {status === "emprestado" ? (
            <label className="col-span-full flex animate-[acv-fade_300ms_both] flex-col gap-2 font-semibold text-lentfg text-xs">
              Emprestado para quem?
              <input
                {...register("borrower")}
                className={cn(fieldInput, "bg-lentbg")}
                placeholder="Nome da pessoa"
              />
            </label>
          ) : null}
          <Field
            className="col-span-full"
            error={err("notes")}
            label="Anotações pessoais"
          >
            <textarea
              {...register("notes")}
              className="resize-y rounded-lg border border-line2 bg-card p-3 text-ink text-sm leading-[1.5] outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink"
              placeholder="Resenha, citações favoritas, dedicatória, estado de conservação…"
              rows={4}
            />
          </Field>
        </div>
        <datalist id="generos">
          {lists.genres.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <datalist id="nacionalidades">
          {lists.nationalities.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <datalist id="etnias">
          {lists.ethnicities.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="flex flex-wrap items-center justify-between gap-3 border-soft border-t pt-4">
          <div>
            {book ? <DeleteButton onConfirm={() => del(book)} /> : null}
          </div>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
              onClick={requestClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-lg border-0 bg-ink px-5 font-semibold text-card text-sm hover:bg-acc active:scale-[.97]"
              disabled={formState.isSubmitting}
              type="submit"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// --- Emprestado para quem? ----------------------------------------------------

function LendDialog() {
  const app = useApp();
  const book = app.lendFor;
  const [name, setName] = useState(book?.borrower ?? "");
  return (
    <Modal
      className="max-w-[440px]"
      initialFocus="input"
      onOpenChange={(o) => !o && app.closeLend()}
      open={!!book}
      title="Emprestado para quem?"
      veilClassName="z-40 py-20"
    >
      {book ? (
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            app.confirmLend(book, name);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="m-0 font-bold text-xl">Emprestado para quem?</h2>
              <span className="truncate text-mute text-sm">{book.title}</span>
            </div>
            <ModalClose />
          </div>
          <label className="flex flex-col gap-2 font-semibold text-lentfg text-xs">
            Nome da pessoa
            <input
              className={cn(fieldInput, "bg-lentbg")}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da pessoa"
              value={name}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
              onClick={app.closeLend}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-lg border-0 bg-ink px-5 font-semibold text-card text-sm hover:bg-acc"
              type="submit"
            >
              Marcar como emprestado
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

// --- Host --------------------------------------------------------------------

export function BookModals() {
  const app = useApp();
  const books = useBooks();
  const m = app.modal;
  const book = m && m.id ? (books.find((b) => b.id === m.id) ?? null) : null;
  const open = !!m && (m.kind === "edit" ? !m.id || !!book : !!book);
  return (
    <>
      <Modal
        className={m?.kind === "edit" ? "max-w-[920px]" : "max-w-[860px]"}
        guardChanges={m?.kind === "edit"}
        // Ficha → edição troca de véu, como no standalone (a rolagem volta ao topo).
        key={"book-modal-" + (m ? m.kind + (m.id ?? "new") : "none")}
        onOpenChange={(o) => !o && app.closeModal()}
        open={open}
        title={
          m?.kind === "view"
            ? (book?.title ?? "Ficha")
            : book
              ? "Editar ficha"
              : "Registrar livro"
        }
      >
        {m?.kind === "view" && book ? (
          <ViewModal book={book} key={"v" + book.id} />
        ) : null}
        {m?.kind === "edit" ? (
          <EditModal book={book} key={"e" + (m.id ?? "new")} />
        ) : null}
      </Modal>
      <LendDialog key={"lend-" + (app.lendFor?.id ?? "none")} />
    </>
  );
}
