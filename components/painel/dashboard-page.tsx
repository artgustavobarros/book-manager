"use client";

import { cn } from "cn";
import { useMemo, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { MiniCover } from "@/components/books/mini-cover";
import {
  CarouselDots,
  trackNarrow,
  useCarousel,
} from "@/components/ui/carousel";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import { dashboard, type Pace } from "@/lib/domain/dashboard";
import { fmtDate, lentDurationLabel } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

const PACE_CLASS: Record<Pace, string> = {
  done: "bg-success-bg text-success-fg",
  on: "bg-success-bg text-success-fg",
  behind: "bg-warning-bg text-warning-fg",
};

const card = "rounded-xl border border-line bg-card";

function LentModal({
  open,
  onOpenChange,
  books,
  onReturn,
  onGoShelf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: Book[];
  onReturn: (book: Book) => void;
  onGoShelf: () => void;
}) {
  return (
    <Modal
      className="w-full max-w-[540px] p-6"
      description="Livros que estão emprestados no momento"
      onOpenChange={onOpenChange}
      open={open}
      title="Livros emprestados"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="m-0 font-bold font-title text-ink text-xl">
              Livros emprestados
            </h2>
            <span className="rounded-full bg-lentbg px-2 py-0.5 font-semibold text-lentfg text-xs">
              {books.length}
            </span>
          </div>
          <ModalClose />
        </div>

        {books.length ? (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {books.map((b) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-line2 bg-card p-3"
                key={b.id}
              >
                <MiniCover
                  book={b}
                  className="h-12 w-8 flex-none rounded text-xs"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold text-ink text-sm">
                    {b.title}
                  </span>
                  <span className="truncate text-mute text-xs">
                    {b.author || "Autor desconhecido"}
                  </span>
                  <span className="font-semibold text-lentfg text-xs">
                    Com {b.borrower}
                    {b.updatedAt ? (
                      <span className="opacity-75">
                        {" "}
                        · {lentDurationLabel(b.updatedAt)}
                      </span>
                    ) : null}
                  </span>
                </div>
                <button
                  aria-label={`Devolver ${b.title}`}
                  className="h-8 flex-none rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-xs hover:border-ink hover:text-acc active:scale-95"
                  onClick={() => onReturn(b)}
                  type="button"
                >
                  Devolver
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-mute text-sm">
            Todos os livros estão em casa! Nenhum livro emprestado no momento.
          </div>
        )}

        <div className="flex justify-end border-line border-t pt-3">
          <button
            className="font-semibold text-acc text-xs hover:underline"
            onClick={onGoShelf}
            type="button"
          >
            Ver todos na Estante →
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DashboardPage() {
  const app = useApp();
  const books = useBooks();
  const { goShelf } = useShelfState();
  const [lentOpen, setLentOpen] = useState(false);
  const lentBooks = useMemo(
    () => books.filter((b) => b.status === "emprestado"),
    [books]
  );
  const d = useMemo(
    () =>
      dashboard(books, {
        goal: app.goal,
        now: new Date(app.now),
        tz: app.tz,
        userName: app.user.name,
      }),
    [books, app.goal, app.now, app.tz, app.user.name]
  );
  const kpiCar = useCarousel(d.kpis.length);
  const listCar = useCarousel(2);

  return (
    <PageMain>
      <div className="flex flex-col gap-1">
        <span className="text-mute text-sm">{d.todayLabel}</span>
        <h1 className="m-0 font-bold font-title text-3xl">{d.greeting}</h1>
      </div>

      <div
        {...kpiCar.trackProps}
        aria-label="Resumo do acervo"
        className={cn(
          "grid touch-pan-x touch-pan-y grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3",
          "max-[640px]:auto-cols-[72%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none",
          trackNarrow
        )}
        role="region"
        tabIndex={0}
      >
        {d.kpis.map((k, i) => {
          const isLent = k.label === "Emprestados";
          return (
            <div
              className={cn(
                card,
                "flex animate-acv-in snap-start flex-col gap-3 p-5",
                isLent && "cursor-pointer transition-colors hover:border-ink"
              )}
              key={k.label}
              onClick={isLent ? () => setLentOpen(true) : undefined}
              role={isLent ? "button" : undefined}
              style={{ animationDelay: i * 50 + "ms" }}
              tabIndex={isLent ? 0 : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-mute text-xs">{k.label}</span>
                {isLent ? (
                  <span className="font-semibold text-[11px] text-acc">
                    Ver lista →
                  </span>
                ) : null}
              </div>
              <span className="font-bold font-title text-3xl tabular-nums leading-none">
                {k.value}
              </span>
              <span className="text-mute text-xs">{k.sub}</span>
            </div>
          );
        })}
      </div>
      <CarouselDots
        count={d.kpis.length}
        index={kpiCar.index}
        onGo={kpiCar.go}
      />

      <div className="flex flex-wrap gap-4">
        <section
          className={cn(
            card,
            "flex min-w-0 flex-[2_1_460px] flex-col gap-5 px-6 py-5"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 font-semibold text-base">
              Meta de leitura {d.year}
            </h2>
            {d.paceShow ? (
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-semibold text-xs",
                  PACE_CLASS[d.pace]
                )}
              >
                {d.paceLabel}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-bold font-title text-5xl tabular-nums leading-none">
              {d.goalDone}
            </span>
            <span className="text-base text-mute">
              de {d.goal} livros lidos
            </span>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-line2 p-1">
              <button
                aria-label="Diminuir meta"
                className="size-7 rounded-md border-0 bg-transparent text-base text-ink hover:bg-hov"
                onClick={() => app.changeGoal(-1)}
                type="button"
              >
                −
              </button>
              <span className="px-2 font-semibold text-mute text-xs">
                Meta: {d.goal}
              </span>
              <button
                aria-label="Aumentar meta"
                className="size-7 rounded-md border-0 bg-transparent text-base text-ink hover:bg-hov"
                onClick={() => app.changeGoal(1)}
                type="button"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative h-3 rounded-full bg-soft">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-acc transition-[width] duration-700 ease-emphasized"
                style={{ width: d.goalPct }}
              />
              <div
                className="absolute -top-1 -bottom-1 w-0.5 rounded-[2px] bg-ink"
                style={{ left: d.expectedPct }}
                title="Esperado até hoje"
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3 text-mute text-xs">
              <span>{d.goalLine}</span>
              <span>Marcador: {d.expectedN} esperados até hoje</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-soft border-t pt-4">
            <span className="font-medium text-mute text-xs">
              Lidos em {d.year}
            </span>
            {d.yearReads.length ? (
              <div className="flex flex-wrap gap-2">
                {d.yearReads.map((b) => (
                  <div className="group/item relative" key={b.id}>
                    <MiniCover
                      as="button"
                      book={b}
                      className="h-14 w-9 rounded text-sm shadow-[var(--shadow-xs)] transition-transform duration-150 hover:-translate-y-[3px]"
                      onClick={() => app.openView(b.id)}
                      title={b.title}
                    />
                    <button
                      aria-label={`Desfazer leitura de ${b.title}`}
                      className="absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center rounded-full border border-line2 bg-card text-[10px] text-mute opacity-0 shadow transition-opacity hover:border-ink hover:text-ink group-focus-within/item:opacity-100 group-hover/item:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        app.undoRead(b);
                      }}
                      title="Desfazer marcação de lido"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-mute text-sm">
                Nenhum livro marcado como lido este ano ainda.
              </span>
            )}
          </div>
        </section>

        <div
          {...listCar.trackProps}
          aria-label="Listas do painel"
          className={cn(
            "contents",
            "max-[640px]:grid max-[640px]:flex-[1_1_100%] max-[640px]:auto-cols-[86%] max-[640px]:grid-flow-col max-[640px]:items-stretch max-[640px]:gap-3",
            trackNarrow
          )}
          role="region"
          tabIndex={0}
        >
          <section
            className={cn(
              card,
              "flex min-w-0 flex-[1_1_280px] snap-start flex-col gap-4 px-6 py-5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 font-semibold text-base">Lendo agora</h2>
              <span className="text-mute text-xs">{d.readingCount}</span>
            </div>
            {d.reading.length ? (
              <div className="flex flex-col gap-3">
                {d.reading.map((b) => (
                  <div className="flex items-center gap-3" key={b.id}>
                    <MiniCover
                      as="button"
                      book={b}
                      className="h-14 w-9 rounded text-sm"
                      onClick={() => app.openView(b.id)}
                    />
                    <button
                      className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left text-ink"
                      onClick={() => app.openView(b.id)}
                      type="button"
                    >
                      <span className="w-full truncate font-semibold text-sm">
                        {b.title}
                      </span>
                      <span className="w-full truncate text-mute text-xs">
                        {b.author || "Autor desconhecido"}
                      </span>
                    </button>
                    <button
                      className="h-8 flex-none rounded-lg border border-line2 bg-card px-3 font-semibold text-ink text-xs hover:border-ink active:scale-95"
                      onClick={() => app.finish(b)}
                      type="button"
                    >
                      Terminei
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-mute text-sm leading-[1.5]">
                Nenhum livro em leitura. Mude o status de um livro para “Lendo”
                ou use “Me surpreenda”.
              </span>
            )}
          </section>
          <section
            className={cn(
              card,
              "flex min-w-0 flex-[1_1_280px] snap-start flex-col gap-4 px-6 py-5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 font-semibold text-base">
                Últimos adicionados
              </h2>
              <button
                className="border-0 bg-transparent p-0 font-semibold text-mute text-xs hover:text-ink"
                onClick={() => goShelf({})}
                type="button"
              >
                Ver estante →
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {d.recent.map((b) => (
                <div
                  className="-m-1 flex items-center gap-3 rounded-lg p-1 text-left text-ink transition-[background-color] duration-150 hover:bg-hov"
                  key={b.id}
                >
                  <button
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-ink"
                    onClick={() => app.openView(b.id)}
                    type="button"
                  >
                    <MiniCover book={b} className="h-11 w-8 rounded text-xs" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-semibold text-sm">
                        {b.title}
                      </span>
                      <span className="truncate text-mute text-xs">
                        {b.author || "Autor desconhecido"}
                      </span>
                    </span>
                  </button>
                  {b.status === "nao-lido" ? (
                    <button
                      aria-label={`Começar a ler ${b.title}`}
                      className="h-7 flex-none rounded-md border border-line2 bg-card px-2 font-semibold text-ink text-xs hover:border-ink hover:text-acc active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        app.startReading(b);
                      }}
                      title="Começar a ler"
                      type="button"
                    >
                      Ler
                    </button>
                  ) : (
                    <span className="flex-none text-mute text-xs tabular-nums">
                      {fmtDate(b.acquiredOn)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
        <CarouselDots
          className="flex-[1_1_100%]"
          count={2}
          index={listCar.index}
          onGo={listCar.go}
        />
      </div>

      <LentModal
        books={lentBooks}
        onGoShelf={() => {
          setLentOpen(false);
          goShelf({ status: "emprestado" });
        }}
        onOpenChange={setLentOpen}
        onReturn={(b) => app.returnBook(b)}
        open={lentOpen}
      />
    </PageMain>
  );
}
