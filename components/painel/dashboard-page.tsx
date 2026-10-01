"use client";

import { cn } from "cn";
import { useMemo } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { MiniCover } from "@/components/books/mini-cover";
import { CarouselDots, trackNarrow, useCarousel } from "@/components/ui/carousel";
import { useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import { dashboard, type Pace } from "@/lib/domain/dashboard";
import { fmtDate } from "@/lib/domain/text";

const PACE_CLASS: Record<Pace, string> = {
  done: "bg-success-bg text-success-fg",
  on: "bg-success-bg text-success-fg",
  behind: "bg-warning-bg text-warning-fg",
};

const card = "rounded-xl border border-line bg-card";

export function DashboardPage() {
  const app = useApp();
  const books = useBooks();
  const { goShelf } = useShelfState();
  const d = useMemo(
    () => dashboard(books, { goal: app.goal, now: new Date(app.now), tz: app.tz, userName: app.user.name }),
    [books, app.goal, app.now, app.tz, app.user.name],
  );
  const kpiCar = useCarousel(d.kpis.length);
  const listCar = useCarousel(2);

  return (
    <PageMain>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-mute">{d.todayLabel}</span>
        <h1 className="m-0 text-3xl font-bold tracking-[-.025em]">{d.greeting}</h1>
      </div>

      <div
        {...kpiCar.trackProps}
        className={cn(
          "grid touch-pan-x touch-pan-y grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3",
          "max-[640px]:auto-cols-[72%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none",
          trackNarrow,
        )}
      >
        {d.kpis.map((k, i) => (
          <div
            key={k.label}
            style={{ animationDelay: i * 50 + "ms" }}
            className={cn(card, "flex animate-acv-in snap-start flex-col gap-3 p-5")}
          >
            <span className="text-xs font-medium text-mute">{k.label}</span>
            <span className="text-3xl leading-none font-bold tracking-[-.025em] tabular-nums">{k.value}</span>
            <span className="text-xs text-mute">{k.sub}</span>
          </div>
        ))}
      </div>
      <CarouselDots count={d.kpis.length} index={kpiCar.index} onGo={kpiCar.go} />

      <div className="flex flex-wrap gap-4">
        <section className={cn(card, "flex min-w-0 flex-[2_1_460px] flex-col gap-5 px-6 py-5")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold">Meta de leitura {d.year}</h2>
            {d.paceShow ? (
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", PACE_CLASS[d.pace])}>{d.paceLabel}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-5xl leading-none font-bold tracking-[-.05em] tabular-nums">{d.goalDone}</span>
            <span className="text-base text-mute">de {d.goal} livros lidos</span>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-line2 p-1">
              <button
                type="button"
                aria-label="Diminuir meta"
                onClick={() => app.changeGoal(-1)}
                className="size-7 rounded-md border-0 bg-transparent text-base text-ink hover:bg-hov"
              >
                −
              </button>
              <span className="px-2 text-xs font-semibold text-mute">Meta: {d.goal}</span>
              <button
                type="button"
                aria-label="Aumentar meta"
                onClick={() => app.changeGoal(1)}
                className="size-7 rounded-md border-0 bg-transparent text-base text-ink hover:bg-hov"
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
                title="Esperado até hoje"
                className="absolute -top-1 -bottom-1 w-0.5 rounded-[2px] bg-ink"
                style={{ left: d.expectedPct }}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3 text-xs text-mute">
              <span>{d.goalLine}</span>
              <span>Marcador: {d.expectedN} esperados até hoje</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-soft pt-4">
            <span className="text-xs font-medium text-mute">Lidos em {d.year}</span>
            {d.yearReads.length ? (
              <div className="flex flex-wrap gap-2">
                {d.yearReads.map((b) => (
                  <MiniCover
                    key={b.id}
                    as="button"
                    book={b}
                    title={b.title}
                    onClick={() => app.openView(b.id)}
                    className="h-14 w-9 rounded text-sm shadow-[var(--shadow-xs)] transition-transform duration-150 hover:-translate-y-[3px]"
                  />
                ))}
              </div>
            ) : (
              <span className="text-sm text-mute">Nenhum livro marcado como lido este ano ainda.</span>
            )}
          </div>
        </section>

        <div
          {...listCar.trackProps}
          className={cn(
            "contents",
            "max-[640px]:grid max-[640px]:flex-[1_1_100%] max-[640px]:auto-cols-[86%] max-[640px]:grid-flow-col max-[640px]:items-stretch max-[640px]:gap-3",
            trackNarrow,
          )}
        >
          <section className={cn(card, "flex min-w-0 flex-[1_1_280px] snap-start flex-col gap-4 px-6 py-5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-semibold">Lendo agora</h2>
              <span className="text-xs text-mute">{d.readingCount}</span>
            </div>
            {d.reading.length ? (
              <div className="flex flex-col gap-3">
                {d.reading.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <MiniCover as="button" book={b} onClick={() => app.openView(b.id)} className="h-14 w-9 rounded text-sm" />
                    <div
                      onClick={() => app.openView(b.id)}
                      className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5"
                    >
                      <span className="truncate text-sm font-semibold">{b.title}</span>
                      <span className="truncate text-xs text-mute">{b.author || "Autor desconhecido"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => app.finish(b)}
                      className="h-8 flex-none rounded-lg border border-line2 bg-card px-3 text-xs font-semibold text-ink hover:border-ink active:scale-95"
                    >
                      Terminei
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm leading-[1.5] text-mute">
                Nenhum livro em leitura. Mude o status de um livro para “Lendo” ou use “Me surpreenda”.
              </span>
            )}
          </section>
          <section className={cn(card, "flex min-w-0 flex-[1_1_280px] snap-start flex-col gap-4 px-6 py-5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-semibold">Últimos adicionados</h2>
              <button
                type="button"
                onClick={() => goShelf({})}
                className="border-0 bg-transparent p-0 text-xs font-semibold text-mute hover:text-ink"
              >
                Ver estante →
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {d.recent.map((b) => (
                <div
                  key={b.id}
                  onClick={() => app.openView(b.id)}
                  className="-m-1 flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-[background-color] duration-150 hover:bg-hov"
                >
                  <MiniCover book={b} className="h-11 w-8 rounded text-xs" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{b.title}</span>
                    <span className="truncate text-xs text-mute">{b.author || "Autor desconhecido"}</span>
                  </div>
                  <span className="flex-none text-xs text-mute tabular-nums">{fmtDate(b.acquiredOn)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <CarouselDots count={2} index={listCar.index} onGo={listCar.go} className="flex-[1_1_100%]" />
      </div>
    </PageMain>
  );
}
