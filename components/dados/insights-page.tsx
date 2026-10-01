"use client";

import { cn } from "cn";
import { useMemo, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { toast } from "@/components/app/toast";
import { CarouselDots, trackNarrow, useCarousel } from "@/components/ui/carousel";
import { Segmented, segClass } from "@/components/ui/segmented";
import { useBackup } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import { insights, type BarField, type Bars, type InsightScope } from "@/lib/domain/insights";
import type { Facet, FacetKind } from "@/lib/domain/shelf";

const card = "flex min-w-0 snap-start flex-col rounded-xl border border-line bg-card px-6 py-5";
const ease = "cubic-bezier(.2,.7,.2,1)";

function CardHead({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      <span className="text-xs text-mute">{badge}</span>
    </div>
  );
}

function MoreButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("self-start border-0 bg-transparent p-0 text-xs font-semibold text-mute hover:text-ink", className)}
    >
      {label}
    </button>
  );
}

function BarCard({
  title,
  bars,
  barColor,
  capitalize,
  onPick,
  onToggle,
}: {
  title: string;
  bars: Bars;
  barColor: string;
  capitalize?: boolean;
  onPick: (label: string) => void;
  onToggle: () => void;
}) {
  return (
    <section className={cn(card, "gap-3")}>
      <CardHead title={title} badge={bars.badge} />
      <div className="flex flex-col">
        {bars.list.map((r, i) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onPick(r.label)}
            className="-mx-2 grid grid-cols-[minmax(0,152px)_minmax(0,1fr)_32px] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-hov"
          >
            <span className={cn("truncate text-sm", capitalize && "capitalize")}>{r.label}</span>
            <span className="relative h-2 overflow-hidden rounded-full bg-soft">
              <span
                className="absolute inset-y-0 left-0 origin-left rounded-full"
                style={{ width: r.pct, background: barColor, animation: `acv-grow-x 700ms ${ease} both`, animationDelay: i * 40 + "ms" }}
              />
            </span>
            <span className="text-right text-sm font-semibold tabular-nums">{r.count}</span>
          </button>
        ))}
      </div>
      {bars.more ? <MoreButton label={bars.moreLabel} onClick={onToggle} /> : null}
    </section>
  );
}

function EmptyInsights() {
  const app = useApp();
  const backup = useBackup();
  return (
    <PageMain>
      <h1 className="m-0 text-3xl font-bold tracking-[-.025em]">Dados do acervo</h1>
      <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-card px-5 py-16 text-center">
        <span aria-hidden="true" className="mb-2 flex h-11 items-end gap-1">
          <span className="h-5 w-3 rounded-[2px] bg-line2" />
          <span className="h-8 w-3 rounded-[2px] bg-line2" />
          <span className="h-11 w-3 rounded-[2px] bg-line2" />
        </span>
        <span className="text-lg font-semibold">Ainda não há dados para mostrar</span>
        <span className="max-w-[380px] text-sm leading-[1.5] text-pretty text-mute">
          Os gráficos aparecem assim que você registrar o primeiro livro ou sincronizar sua planilha.
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => app.openEdit(null)}
            className="h-10 rounded-lg border-0 bg-ink px-5 text-sm font-semibold text-card hover:bg-acc"
          >
            + Registrar livro
          </button>
          <button
            type="button"
            onClick={() => app.setSyncOpen(true)}
            className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
          >
            Sincronizar planilha
          </button>
          <button
            type="button"
            onClick={backup.pickRestore}
            className="h-10 rounded-lg border border-line2 bg-card px-4 text-sm font-semibold text-ink hover:border-ink"
          >
            Restaurar backup
          </button>
        </div>
      </div>
    </PageMain>
  );
}

export function InsightsPage() {
  const books = useBooks();
  if (books.length === 0) return <EmptyInsights />;
  return <FullInsights />;
}

function FullInsights() {
  const app = useApp();
  const books = useBooks();
  const { update } = useBookActions();
  const { goShelf } = useShelfState();
  const [scope, setScope] = useState<InsightScope>("todos");
  const [expanded, setExpanded] = useState<Partial<Record<BarField, boolean>>>({});
  const [assignAll, setAssignAll] = useState(false);
  const [assignMore, setAssignMore] = useState(false);
  const d = useMemo(
    () => insights(books, { scope, expanded, assignAll, assignMore, year: app.year }),
    [books, scope, expanded, assignAll, assignMore, app.year],
  );
  const kpiCar = useCarousel(4);
  const chartCar = useCarousel(6);

  const drill = (facet: Facet) => goShelf({ status: scope === "lidos" ? "lido" : "todos", facet });
  const pick = (kind: FacetKind) => (value: string) => drill({ kind, value });
  const toggle = (k: BarField) => () => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  return (
    <PageMain>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-mute">{d.scopeCaption}</span>
          <h1 className="m-0 text-3xl font-bold tracking-[-.025em]">Dados do acervo</h1>
        </div>
        <Segmented<InsightScope>
          label="Escopo dos gráficos"
          options={[
            ["todos", "Todo o acervo"],
            ["lidos", "Apenas lidos"],
          ]}
          value={scope}
          onChange={setScope}
          className="rounded-lg p-1"
          itemClassName="rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div
        {...kpiCar.trackProps}
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3",
          "max-[640px]:auto-cols-[72%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none",
          trackNarrow,
        )}
      >
        {d.dataKpis.map((k, i) => (
          <div
            key={k.label}
            style={{ animationDelay: i * 50 + "ms" }}
            className="flex animate-acv-in snap-start flex-col gap-3 rounded-xl border border-line bg-card p-5"
          >
            <span className="text-xs font-medium text-mute">{k.label}</span>
            <span className="text-3xl leading-none font-bold tracking-[-.025em] tabular-nums">{k.value}</span>
            <span className="text-xs leading-[1.4] text-mute">{k.sub}</span>
          </div>
        ))}
      </div>
      <CarouselDots count={4} index={kpiCar.index} onGo={kpiCar.go} />

      <div
        {...chartCar.trackProps}
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-stretch gap-4",
          "max-[640px]:auto-cols-[88%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none",
          trackNarrow,
        )}
      >
        <section className={cn(card, "gap-4")}>
          <CardHead title="Páginas lidas e calhamaços" badge={d.thermoPctLabel} />
          <div className="flex flex-col gap-2">
            <div className="relative h-4 overflow-hidden rounded-full bg-soft">
              <div
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-acc"
                style={{ width: d.thermoPct, animation: `acv-grow-x 1000ms ${ease} both` }}
              />
            </div>
            <span className="text-xs text-mute">{d.thermoLabel}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-soft pt-3">
            <span className="pb-2 text-xs font-medium text-mute">Maiores livros lidos</span>
            {d.bigBooks.map((r) => (
              <button
                key={r.book.id}
                type="button"
                onClick={() => app.openView(r.book.id)}
                className="-mx-2 grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-hov"
              >
                <span className="text-xs font-bold text-mute">{r.rank}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{r.book.title}</span>
                  <span className="truncate text-xs text-mute">{r.book.author}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{r.pages}</span>
              </button>
            ))}
            {d.bigBooks.length === 0 ? <span className="text-sm text-mute">Registre o número de páginas dos livros lidos.</span> : null}
          </div>
        </section>

        <section className={cn(card, "gap-4")}>
          <CardHead title="Livros por status" badge={d.baseLabel} />
          <div className="flex flex-wrap items-center gap-6">
            <div
              className="relative size-[152px] flex-none rounded-full"
              style={{ background: d.donutBg, animation: "acv-fade 700ms both" }}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-2xl font-bold tracking-[-.025em] tabular-nums">{d.donutTotal}</span>
                <span className="text-xs text-mute">livros</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_200px] flex-col">
              {d.statusSeg.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => goShelf({ status: s.k })}
                  className="-mx-2 grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_40px] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-sm text-ink hover:bg-hov"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 flex-none rounded-full" style={{ background: s.dot }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-soft">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: s.bar, background: s.dot }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{s.count}</span>
                  <span className="text-right text-xs text-mute tabular-nums">{s.pct}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <BarCard title="Livros por gênero da obra" bars={d.genre} barColor="var(--ink)" onPick={pick("genero")} onToggle={toggle("genre")} />
        <BarCard
          title="Livros por nacionalidade do autor"
          bars={d.nat}
          barColor="var(--acc)"
          capitalize
          onPick={pick("nacionalidade")}
          onToggle={toggle("nationality")}
        />

        <section className={cn(card, "gap-4")}>
          <CardHead title="Livros lidos por ano" badge={d.yearBadge} />
          {d.yearCols.length ? (
            <div className="flex h-[172px] gap-3">
              {d.yearCols.map((c, i) => (
                <button
                  key={c.year}
                  type="button"
                  title={c.sub}
                  onClick={() => goShelf({ status: "lido", facet: { kind: "lidos-em", value: String(c.year) } })}
                  className="flex min-w-0 flex-1 flex-col border-0 bg-transparent p-0 text-ink"
                >
                  <span className="flex flex-1 flex-col justify-end gap-2 border-b border-line2">
                    <span className="text-center text-xs font-semibold tabular-nums">{c.count}</span>
                    <span
                      className="origin-bottom rounded-t-md transition-[height] duration-500"
                      style={{
                        height: c.pct,
                        background: c.current ? "var(--acc)" : "var(--ink)",
                        animation: `acv-grow-y 700ms ${ease} both`,
                        animationDelay: i * 60 + "ms",
                      }}
                    />
                  </span>
                  <span className="pt-2 text-center text-xs text-mute tabular-nums">{c.year}</span>
                </button>
              ))}
            </div>
          ) : (
            <span className="py-6 text-center text-sm text-mute">Atribua o ano de leitura abaixo para ver o gráfico.</span>
          )}
          <div className="flex flex-col gap-1 border-t border-soft pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <span className="text-xs font-semibold text-mute">Atribuir ano lido</span>
              <div className="flex gap-0.5 rounded-lg bg-seg p-0.5">
                {(
                  [
                    [false, "Sem ano (" + d.assignNoYearCount + ")"],
                    [true, "Todos os lidos (" + d.assignReadCount + ")"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setAssignAll(k);
                      setAssignMore(false);
                    }}
                    className={cn("rounded-md border-0 px-3 py-1 text-xs font-semibold", segClass(assignAll === k))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {d.assignRows.map((r) => (
              <div key={r.book.id} className="flex flex-wrap items-center gap-3 border-t border-soft py-2">
                <div onClick={() => app.openView(r.book.id)} className="flex min-w-0 flex-[1_1_152px] cursor-pointer flex-col">
                  <span className="truncate text-sm font-semibold">{r.book.title}</span>
                  <span className="truncate text-xs text-mute">{r.book.author}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.years.map((y) => (
                    <button
                      key={y.year}
                      type="button"
                      onClick={() => {
                        update(r.book.id, { yearRead: y.on ? null : y.year });
                        if (!y.on) toast(r.book.title + " · lido em " + y.year);
                      }}
                      className={cn(
                        "h-7 rounded-md border px-2 text-xs font-semibold tabular-nums active:scale-[.94]",
                        y.on ? "border-ink bg-ink text-card" : "border-line2 bg-card text-ink",
                      )}
                    >
                      {y.year}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {d.assignEmpty ? <span className="py-2 text-sm text-mute">Todos os livros lidos já têm ano de leitura.</span> : null}
            {d.assignMoreShow ? (
              <MoreButton label={d.assignMoreLabel} onClick={() => setAssignMore((v) => !v)} className="mt-1" />
            ) : null}
          </div>
        </section>

        <BarCard title="Livros por editora" bars={d.pub} barColor="var(--mute)" onPick={pick("editora")} onToggle={toggle("publisher")} />
      </div>
      <CarouselDots count={6} index={chartCar.index} onGo={chartCar.go} />
    </PageMain>
  );
}
