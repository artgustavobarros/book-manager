"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useApp } from "@/components/app/app-provider";
import { toast } from "@/components/app/toast";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import { searchCatalogs } from "@/lib/client/lookup";
import { coverColors, coverImage } from "@/lib/domain/cover";
import { GENRES, suggestions } from "@/lib/domain/genres";
import type { LookupResult } from "@/lib/domain/lookup";
import { STATUS, stat } from "@/lib/domain/status";
import { capitalize, fmtDate, nf } from "@/lib/domain/text";
import { BOOK_STATUSES, type Book, type BookStatus } from "@/lib/domain/types";
import { bookFormSchema, type BookFormOutput, type BookFormValues } from "@/lib/validation/book";

// --- Peças compartilhadas ----------------------------------------------------

const NARROW = "max-[640px]";

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
        `${NARROW}:flex-[1_1_100%] ${NARROW}:flex-row ${NARROW}:items-center ${NARROW}:gap-[14px]`,
        edit ? `${NARROW}:px-[18px] ${NARROW}:py-0` : `${NARROW}:px-[18px] ${NARROW}:py-4`,
      )}
    >
      <div
        style={{ background: coverBg, color: coverInk }}
        className={cn(
          "relative flex aspect-[2/3] w-full flex-none flex-col justify-between overflow-hidden rounded-md px-[14px] py-4 shadow-lift",
          `${NARROW}:w-[84px] ${NARROW}:px-[7px] ${NARROW}:py-2`,
        )}
      >
        <span className={cn("text-[10px] font-semibold tracking-[.1em] uppercase opacity-80", `${NARROW}:text-[6px]`)}>{author}</span>
        <span className={cn("text-[22px] leading-[1.08] font-bold", `${NARROW}:text-xs`)}>{title}</span>
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: coverImage(coverUrl) }} />
      </div>
      <span className="text-xs leading-[1.5] text-mute">{hint}</span>
    </div>
  );
}

/** Excluir em dois cliques ("Excluir livro" → "Confirmar exclusão"). */
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onClick={() => (confirm ? onConfirm() : setConfirm(true))}
      className="-ml-3 h-9 rounded-lg border-0 bg-transparent px-3 text-sm font-semibold text-acc hover:bg-hov"
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
    void remove(book.id).then(() => toast("Livro excluído"));
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
        title={book.title}
        author={author}
        coverUrl={book.coverUrl}
        hint={book.acquiredOn ? "No acervo desde " + fmtDate(book.acquiredOn) + "." : ""}
      />
      <div className={cn("flex min-w-0 flex-[1_1_400px] flex-col gap-5 px-[26px] py-6", `${NARROW}:px-[18px] ${NARROW}:py-5`)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-mute tabular-nums">{book.orderNo ? "Nº " + book.orderNo + " do acervo" : ""}</span>
            <h2 className="m-0 text-2xl leading-[1.15] font-bold tracking-[-.025em] text-balance">{book.title}</h2>
            <button
              type="button"
              title="Ver todos os livros deste autor"
              onClick={() => {
                app.closeModal();
                goShelf({ facet: { kind: "autor", value: author } });
              }}
              className="self-start border-0 bg-transparent p-0 text-base text-mute hover:text-acc hover:underline"
            >
              {author}
            </button>
          </div>
          <ModalClose />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Status"
            value={book.status}
            onChange={(e) => app.setStatus(book, e.target.value as BookStatus)}
            className="h-9 cursor-pointer rounded-lg border border-line2 bg-card px-3 text-sm font-semibold text-ink"
          >
            {STATUS.map((s) => (
              <option key={s.k} value={s.k}>
                {s.label}
              </option>
            ))}
          </select>
          {book.status === "emprestado" && book.borrower ? (
            <span className="rounded-full bg-lentbg px-3 py-1 text-sm font-semibold text-lentfg">Emprestado para {book.borrower}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] gap-x-5 gap-y-4 border-y border-soft py-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold tracking-[.05em] text-mute uppercase">{label}</span>
              <span className="text-sm font-medium [overflow-wrap:anywhere]">{value || "—"}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[.05em] text-mute uppercase">Anotações pessoais</span>
          <div className="rounded-xl bg-hov p-4 text-sm leading-[1.6] whitespace-pre-wrap text-ink">{book.notes || "Sem anotações."}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DeleteButton onConfirm={() => del(book)} />
          <button
            type="button"
            onClick={() => app.openEdit(book.id)}
            className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc"
          >
            Editar ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Registrar / editar -------------------------------------------------------

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

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
    <label className={cn("flex flex-col gap-2 text-xs font-medium text-mute", className)}>
      {label}
      {children}
      {error ? <span role="alert" className="text-xs font-normal text-acc">{error}</span> : null}
    </label>
  );
}

function OnlineSearch({ form }: { form: UseFormReturn<BookFormValues, unknown, BookFormOutput> }) {
  const [sq, setSq] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<LookupResult[] | null>(null);

  async function run() {
    const q = sq.trim() || form.getValues("title").trim();
    if (!q) return setMsg("Digite um título ou ISBN.");
    setLoading(true);
    setMsg("");
    setResults(null);
    const { results, failed } = await searchCatalogs(q);
    setLoading(false);
    setResults(results);
    setMsg(failed ? "Não foi possível consultar os catálogos. Verifique a conexão." : results.length ? "" : "Nenhum resultado encontrado.");
  }

  function pick(r: LookupResult) {
    const set = (k: keyof BookFormValues, v: string) => v && form.setValue(k, v, { shouldDirty: true, shouldValidate: true });
    if (r.coverOnly) set("coverUrl", r.cover);
    else {
      set("title", r.title);
      set("author", r.author);
      set("publisher", r.publisher);
      set("yearPublished", r.year);
      set("pages", r.pages);
      set("coverUrl", r.cover);
    }
    setResults(null);
    setMsg("Dados preenchidos a partir de " + r.source + ". Revise antes de salvar.");
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-hov p-4">
      <span className="text-xs font-semibold text-mute">
        Buscar online por título ou ISBN · Google Livros, Apple Books, Open Library e Amazon (ISBN)
      </span>
      <div className="flex gap-2">
        <input
          aria-label="Buscar online"
          value={sq}
          onChange={(e) => setSq(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="ex.: Torto arado ou 9788554512348"
          className={cn(fieldInput, "flex-1")}
        />
        <button
          type="button"
          onClick={() => void run()}
          className="h-10 flex-none rounded-lg border-0 bg-ink px-4 text-sm font-semibold text-card hover:bg-acc"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {msg ? <span className="text-xs text-mute">{msg}</span> : null}
      {results?.length ? (
        <div className="-mx-2 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(r)}
              className="flex items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-card"
            >
              <span className="relative h-12 w-8 flex-none overflow-hidden rounded bg-soft">
                <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: coverImage(r.cover) }} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-sm font-semibold">{r.title}</span>
                <span className="truncate text-xs text-mute">{r.author || "—"}</span>
                <span className="text-xs text-mute">
                  {[r.publisher, r.year, r.pages ? r.pages + " p." : "", r.source].filter(Boolean).join(" · ")}
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
  const nextOrder = useMemo(() => Math.max(0, ...books.map((b) => b.orderNo || 0)) + 1, [books]);
  const form = useForm<BookFormValues, unknown, BookFormOutput>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: toFormValues(book, nextOrder),
  });
  const { register, formState, setValue } = form;
  const [title, author, coverUrl, status] = useWatch({ control: form.control, name: ["title", "author", "coverUrl", "status"] });
  const lists = useMemo(
    () => ({
      genres: suggestions(books.map((b) => b.genre), GENRES),
      nationalities: suggestions(books.map((b) => b.nationality)),
      ethnicities: suggestions(books.map((b) => b.authorEthnicity)),
    }),
    [books],
  );
  const modalTitle = book ? "Editar ficha" : "Registrar livro";
  const err = (k: keyof BookFormValues) => formState.errors[k]?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    if (book) {
      await update(book.id, values);
      toast("Alterações salvas");
    } else {
      await create(values);
      toast("Livro registrado no acervo");
    }
    app.closeModal();
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-wrap">
      <div className={cn("hidden flex-[1_1_100%] items-center justify-between gap-3 px-5 pt-5 pb-4", `${NARROW}:flex`)}>
        <h2 className="m-0 text-xl font-bold">{modalTitle}</h2>
        <ModalClose />
      </div>
      <CoverPanel
        edit
        title={title || "Título do livro"}
        author={author || "Autor"}
        coverUrl={coverUrl || null}
        hint={book && book.acquiredOn ? "No acervo desde " + fmtDate(book.acquiredOn) + "." : "Sem imagem, a capa é gerada a partir do título e do autor."}
      />
      <div className={cn("flex min-w-0 flex-[1_1_420px] flex-col gap-5 px-[26px] py-6", `${NARROW}:px-[18px] ${NARROW}:py-5`)}>
        <div className={cn("flex items-center justify-between gap-3", `${NARROW}:hidden`)}>
          <h2 className="m-0 text-xl font-bold">{modalTitle}</h2>
          <ModalClose />
        </div>

        <OnlineSearch form={form} />

        <div className={cn("grid grid-cols-3 gap-4", `${NARROW}:grid-cols-2`)}>
          <Field label="Título *" error={err("title")} className="col-span-full">
            <input {...register("title")} aria-invalid={!!err("title")} className={cn(fieldInput, "h-11 text-base font-semibold")} />
          </Field>
          <Field label="Autor(a) *" error={err("author")} className="col-span-2">
            <input {...register("author")} className={fieldInput} />
          </Field>
          <Field label="Gênero do autor(a)">
            <select {...register("authorGender")} className={cn(fieldInput, "px-3")}>
              <option value="">—</option>
              <option value="Homem">Homem</option>
              <option value="Mulher">Mulher</option>
              <option value="Não definido">Não definido</option>
            </select>
          </Field>
          <Field label="Editora" error={err("publisher")}>
            <input {...register("publisher")} className={fieldInput} />
          </Field>
          <Field label="Nacionalidade do autor" error={err("nationality")}>
            <input {...register("nationality")} list="nacionalidades" placeholder="ex.: brasileira" className={fieldInput} />
          </Field>
          <Field label="Cor/etnia do autor(a)" error={err("authorEthnicity")}>
            <input {...register("authorEthnicity")} list="etnias" placeholder="ex.: parda" className={fieldInput} />
          </Field>
          <Field label="Gênero da obra" error={err("genre")}>
            <input {...register("genre")} list="generos" placeholder="ex.: Romance" className={fieldInput} />
          </Field>
          <Field label="Ano de lançamento" error={err("yearPublished")}>
            <input {...register("yearPublished")} type="number" placeholder="ex.: 1949" className={fieldInput} />
          </Field>
          <Field label="Páginas" error={err("pages")}>
            <input {...register("pages")} type="number" placeholder="ex.: 416" className={fieldInput} />
          </Field>
          <Field label="Data de aquisição" error={err("acquiredOn")}>
            <input {...register("acquiredOn")} type="date" className={fieldInput} />
          </Field>
          <Field label="Ano em que foi lido" error={err("yearRead")}>
            <input {...register("yearRead")} type="number" placeholder={"ex.: " + app.year} className={fieldInput} />
          </Field>
          <Field label="Nº de ordem" error={err("orderNo")}>
            <input {...register("orderNo")} type="number" className={fieldInput} />
          </Field>
          <Field label="Capa (link da imagem)" error={err("coverUrl")} className="col-span-full">
            <input {...register("coverUrl")} placeholder="https://… (preenchido pela busca online)" className={fieldInput} />
          </Field>
          <div className="col-span-full flex flex-col gap-2 text-xs font-medium text-mute">
            Status no acervo
            <div role="radiogroup" aria-label="Status no acervo" className="flex flex-wrap gap-2">
              {BOOK_STATUSES.map((k) => {
                const s = stat(k);
                const on = status === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setValue("status", k, { shouldDirty: true });
                      if (k === "lido" && !form.getValues("yearRead")) setValue("yearRead", String(app.year));
                    }}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium active:scale-95",
                      on ? "border-ink bg-ink text-card" : "border-line2 bg-card text-ink",
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: s.dot }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          {status === "emprestado" ? (
            <label className="col-span-full flex animate-[acv-fade_300ms_both] flex-col gap-2 text-xs font-semibold text-lentfg">
              Emprestado para quem?
              <input {...register("borrower")} placeholder="Nome da pessoa" className={cn(fieldInput, "bg-lentbg")} />
            </label>
          ) : null}
          <Field label="Anotações pessoais" error={err("notes")} className="col-span-full">
            <textarea
              {...register("notes")}
              rows={4}
              placeholder="Resenha, citações favoritas, dedicatória, estado de conservação…"
              className="resize-y rounded-lg border border-line2 bg-card p-3 text-sm leading-[1.5] text-ink outline-none placeholder:text-[light-dark(#757575,#a9a9a9)] focus:border-ink"
            />
          </Field>
        </div>
        <datalist id="generos">{lists.genres.map((g) => <option key={g} value={g} />)}</datalist>
        <datalist id="nacionalidades">{lists.nationalities.map((n) => <option key={n} value={n} />)}</datalist>
        <datalist id="etnias">{lists.ethnicities.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-soft pt-4">
          <div>{book ? <DeleteButton onConfirm={() => del(book)} /> : null}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={app.closeModal}
              className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting}
              aria-disabled={!title.trim() || undefined}
              className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc active:scale-[.97] aria-disabled:opacity-40"
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
    <Modal open={!!book} onOpenChange={(o) => !o && app.closeLend()} title="Emprestado para quem?" className="max-w-[440px]" veilClassName="z-40 py-20">
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
              <h2 className="m-0 text-xl font-bold">Emprestado para quem?</h2>
              <span className="truncate text-sm text-mute">{book.title}</span>
            </div>
            <ModalClose />
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-lentfg">
            Nome da pessoa
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da pessoa" className={cn(fieldInput, "bg-lentbg")} />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={app.closeLend}
              className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
            >
              Cancelar
            </button>
            <button type="submit" className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc">
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
  const book = m && m.id ? books.find((b) => b.id === m.id) ?? null : null;
  const open = !!m && (m.kind === "edit" ? !m.id || !!book : !!book);
  return (
    <>
      <Modal
        open={open}
        onOpenChange={(o) => !o && app.closeModal()}
        title={m?.kind === "view" ? book?.title ?? "Ficha" : book ? "Editar ficha" : "Registrar livro"}
        className={m?.kind === "edit" ? "max-w-[920px]" : "max-w-[860px]"}
      >
        {m?.kind === "view" && book ? <ViewModal key={"v" + book.id} book={book} /> : null}
        {m?.kind === "edit" ? <EditModal key={"e" + (m.id ?? "new")} book={book} /> : null}
      </Modal>
      <LendDialog key={app.lendFor?.id ?? "none"} />
    </>
  );
}


