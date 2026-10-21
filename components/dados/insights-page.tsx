"use client";

import { cn } from "cn";
import { useMemo, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { KpiContent, kpiCardClass } from "@/components/app/kpi";
import { toast } from "@/components/app/toast";
import {
  CarouselDots,
  trackNarrow,
  useCarousel,
} from "@/components/ui/carousel";
import { Segmented, segClass } from "@/components/ui/segmented";
import { useBackup } from "@/hooks/use-backup";
import { useBookActions, useBooks } from "@/hooks/use-books";
import { useShelfState } from "@/hooks/use-shelf-state";
import {
  type BarField,
  type Bars,
  type InsightScope,
  insights,
} from "@/lib/domain/insights";
import type { Facet, FacetKind } from "@/lib/domain/shelf";

const card =
  "flex min-w-0 snap-start flex-col rounded-xl border border-line bg-card px-6 py-5";
const ease = "cubic-bezier(.2,.7,.2,1)";

function CardHead({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 font-semibold text-base">{title}</h2>
      <span className="text-mute text-xs">{badge}</span>
    </div>
  );
}

function MoreButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "self-start border-0 bg-transparent p-0 font-semibold text-mute text-xs hover:text-ink",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function BarCard({
  title,
  bars,
  capitalize,
  onPick,
  onToggle,
}: {
  title: string;
  bars: Bars;
  capitalize?: boolean;
  onPick: (label: string) => void;
  onToggle: () => void;
}) {
  return (
    <section className={cn(card, "gap-3")}>
      <CardHead badge={bars.badge} title={title} />
      <div className="flex flex-col">
        {bars.list.map((r, i) => (
          <button
            className="-mx-2 grid grid-cols-[minmax(0,152px)_minmax(0,1fr)_32px] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-hov"
            key={r.key}
            onClick={() => onPick(r.label)}
            type="button"
          >
            <span
              className={cn("truncate text-sm", capitalize && "capitalize")}
            >
              {r.label}
            </span>
            <span className="relative h-2 overflow-hidden rounded-full bg-soft">
              <span
                className="absolute inset-y-0 left-0 origin-left rounded-full"
                style={{
                  width: r.pct,
                  background: "var(--acc)",
                  animation: `acv-grow-x 700ms ${ease} both`,
                  animationDelay: i * 40 + "ms",
                }}
              />
            </span>
            <span className="text-right font-semibold text-sm tabular-nums">
              {r.count}
            </span>
          </button>
        ))}
      </div>
      {bars.more ? (
        <MoreButton label={bars.moreLabel} onClick={onToggle} />
      ) : null}
    </section>
  );
}

function EmptyInsights() {
  const app = useApp();
  const backup = useBackup();
  return (
    <PageMain>
      <h1 className="m-0 font-bold font-title text-3xl">Dados do acervo</h1>
      <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-card px-5 py-16 text-center">
        <span aria-hidden="true" className="mb-2 flex h-11 items-end gap-1">
          <span className="h-5 w-3 rounded-[2px] bg-line2" />
          <span className="h-8 w-3 rounded-[2px] bg-line2" />
          <span className="h-11 w-3 rounded-[2px] bg-line2" />
        </span>
        <span className="font-semibold text-lg">
          Ainda não há dados para mostrar
        </span>
        <span className="max-w-[380px] text-pretty text-mute text-sm leading-[1.5]">
          Os gráficos aparecem assim que você registrar o primeiro livro ou
          sincronizar sua planilha.
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            className="h-10 rounded-lg border-0 bg-acc px-5 font-semibold text-onacc text-sm hover:bg-acc2"
            onClick={() => app.openEdit(null)}
            type="button"
          >
            + Registrar livro
          </button>
          <button
            className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
            onClick={() => app.setSyncOpen(true)}
            type="button"
          >
            Sincronizar planilha
          </button>
          <button
            className="h-10 rounded-lg border border-line2 bg-card px-4 font-semibold text-ink text-sm hover:border-ink"
            onClick={backup.pickRestore}
            type="button"
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
  if (books.length === 0) {
    return <EmptyInsights />;
  }
  return <FullInsights />;
}

function FullInsights() {
  const app = useApp();
  const books = useBooks();
  const { update } = useBookActions();
  const { goShelf } = useShelfState();
  const [scope, setScope] = useState<InsightScope>("todos");
  const [expanded, setExpanded] = useState<Partial<Record<BarField, boolean>>>(
    {}
  );
  const [assignAll, setAssignAll] = useState(false);
  const [assignMore, setAssignMore] = useState(false);
  const d = useMemo(
    () =>
      insights(books, {
        scope,
        expanded,
        assignAll,
        assignMore,
        year: app.year,
      }),
    [books, scope, expanded, assignAll, assignMore, app.year]
  );
  const kpiCar = useCarousel(4);
  const chartCar = useCarousel(6);

  const drill = (facet: Facet) => goShelf({ facet });
  const pick = (kind: FacetKind) => (value: string) => drill({ kind, value });
  const toggle = (k: BarField) => () =>
    setExpanded((e) => ({ ...e, [k]: !e[k] }));

  return (
    <PageMain>
      <h1 className="m-0 font-bold font-title text-3xl">Dados do acervo</h1>

      <div
        {...kpiCar.trackProps}
        aria-label="Indicadores do acervo"
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3",
          "max-[640px]:auto-cols-[100%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none max-[640px]:gap-4",
          trackNarrow
        )}
        role="region"
        tabIndex={0}
      >
        {d.dataKpis.map((k, i) => (
          <div
            className={kpiCardClass}
            key={k.label}
            style={{ animationDelay: i * 50 + "ms" }}
          >
            <KpiContent
              label={k.label}
              sub={k.sub}
              text={k.text}
              value={k.value}
            />
          </div>
        ))}
      </div>
      <CarouselDots count={4} index={kpiCar.index} onGo={kpiCar.go} />

      <Segmented<InsightScope>
        className="w-full rounded-lg p-1"
        itemClassName="flex-1 rounded-lg px-3 py-2 text-sm"
        label="Escopo dos gráficos"
        onChange={setScope}
        options={[
          ["todos", "Todo o acervo"],
          ["lidos", "Apenas lidos"],
        ]}
        value={scope}
      />

      <div
        {...chartCar.trackProps}
        aria-label="Gráficos do acervo"
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-stretch gap-4",
          "max-[640px]:auto-cols-[100%] max-[640px]:grid-flow-col max-[640px]:grid-cols-none max-[640px]:gap-4",
          trackNarrow
        )}
        role="region"
        tabIndex={0}
      >
        <section className={cn(card, "gap-4")}>
          <CardHead
            badge={d.thermoPctLabel}
            title="Páginas lidas e calhamaços"
          />
          <div className="flex flex-col gap-2">
            <div className="relative h-4 overflow-hidden rounded-full bg-soft">
              <div
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-acc"
                style={{
                  width: d.thermoPct,
                  animation: `acv-grow-x 1000ms ${ease} both`,
                }}
              />
            </div>
            <span className="text-mute text-xs">{d.thermoLabel}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-soft border-t pt-3">
            <span className="pb-2 font-medium text-mute text-xs">
              Maiores livros lidos
            </span>
            {d.bigBooks.map((r) => (
              <button
                className="-mx-2 grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink hover:bg-hov"
                key={r.book.id}
                onClick={() => app.openView(r.book.id)}
                type="button"
              >
                <span className="font-bold text-mute text-xs">{r.rank}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-sm">
                    {r.book.title}
                  </span>
                  <span className="truncate text-mute text-xs">
                    {r.book.author}
                  </span>
                </span>
                <span className="font-semibold text-sm tabular-nums">
                  {r.pages}
                </span>
              </button>
            ))}
            {d.bigBooks.length === 0 ? (
              <span className="text-mute text-sm">
                Registre o número de páginas dos livros lidos.
              </span>
            ) : null}
          </div>
        </section>

        <section className={cn(card, "gap-4")}>
          <CardHead badge={d.baseLabel} title="Livros por status" />
          <div className="flex flex-wrap items-center gap-6">
            <div
              className="relative size-[152px] flex-none rounded-full"
              style={{
                background: d.donutBg,
                animation: "acv-fade 700ms both",
              }}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="font-bold font-title text-2xl tabular-nums">
                  {d.donutTotal}
                </span>
                <span className="text-mute text-xs">livros</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_200px] flex-col">
              {d.statusSeg.map((s) => (
                <button
                  className="-mx-2 grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_40px] items-center gap-3 rounded-lg border-0 bg-transparent p-2 text-left text-ink text-sm hover:bg-hov"
                  key={s.k}
                  onClick={() => goShelf({ status: s.k })}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 flex-none rounded-full"
                      style={{ background: s.dot }}
                    />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-soft">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: s.bar, background: s.dot }}
                    />
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {s.count}
                  </span>
                  <span className="text-right text-mute text-xs tabular-nums">
                    {s.pct}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <BarCard
          bars={d.genre}
          onPick={pick("genero")}
          onToggle={toggle("genre")}
          title="Livros por gênero da obra"
        />
        <BarCard
          bars={d.nat}
          capitalize
          onPick={pick("nacionalidade")}
          onToggle={toggle("nationality")}
          title="Livros por nacionalidade do autor"
        />

        <section className={cn(card, "gap-4")}>
          <CardHead badge={d.yearBadge} title="Livros lidos por ano" />
          {d.yearCols.length ? (
            <div className="flex h-[172px] gap-3">
              {d.yearCols.map((c, i) => (
                <button
                  className="flex min-w-0 flex-1 flex-col border-0 bg-transparent p-0 text-ink"
                  key={c.year}
                  onClick={() =>
                    goShelf({
                      status: "lido",
                      facet: { kind: "lidos-em", value: String(c.year) },
                    })
                  }
                  title={c.sub}
                  type="button"
                >
                  <span className="flex flex-1 flex-col justify-end gap-2 border-line2 border-b">
                    <span className="text-center font-semibold text-xs tabular-nums">
                      {c.count}
                    </span>
                    <span
                      className="origin-bottom rounded-t-md transition-[height] duration-500"
                      style={{
                        height: c.pct,
                        background: c.current
                          ? "var(--acc)"
                          : "color-mix(in oklch, var(--acc) 45%, var(--card))",
                        animation: `acv-grow-y 700ms ${ease} both`,
                        animationDelay: i * 60 + "ms",
                      }}
                    />
                  </span>
                  <span className="pt-2 text-center text-mute text-xs tabular-nums">
                    {c.year}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span className="py-6 text-center text-mute text-sm">
              Atribua o ano de leitura abaixo para ver o gráfico.
            </span>
          )}
          <div className="flex flex-col gap-1 border-soft border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <span className="font-semibold text-mute text-xs">
                Atribuir ano lido
              </span>
              <div className="flex gap-0.5 rounded-lg bg-seg p-0.5">
                {(
                  [
                    [false, "Sem ano (" + d.assignNoYearCount + ")"],
                    [true, "Todos os lidos (" + d.assignReadCount + ")"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    aria-pressed={assignAll === k}
                    className={cn(
                      "rounded-md border-0 px-3 py-1 font-semibold text-xs",
                      segClass(assignAll === k)
                    )}
                    key={label}
                    onClick={() => {
                      setAssignAll(k);
                      setAssignMore(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {d.assignRows.map((r) => (
              <div
                className="flex flex-wrap items-center gap-3 border-soft border-t py-2"
                key={r.book.id}
              >
                <button
                  className="flex min-w-0 flex-[1_1_152px] cursor-pointer flex-col border-0 bg-transparent p-0 text-left text-ink"
                  onClick={() => app.openView(r.book.id)}
                  type="button"
                >
                  <span className="w-full truncate font-semibold text-sm">
                    {r.book.title}
                  </span>
                  <span className="w-full truncate text-mute text-xs">
                    {r.book.author}
                  </span>
                </button>
                <div className="flex flex-wrap gap-1">
                  {r.years.map((y) => (
                    <button
                      aria-label={
                        (y.on ? "Lido em " : "Marcar como lido em ") + y.year
                      }
                      aria-pressed={y.on}
                      className={cn(
                        "h-7 rounded-md border px-2 font-semibold text-xs tabular-nums active:scale-[.94]",
                        y.on
                          ? "border-ink bg-ink text-card"
                          : "border-line2 bg-card text-ink"
                      )}
                      key={y.year}
                      onClick={() => {
                        void update(r.book.id, {
                          yearRead: y.on ? null : y.year,
                        }).then(
                          (ok) =>
                            ok &&
                            !y.on &&
                            toast(r.book.title + " · lido em " + y.year)
                        );
                      }}
                      type="button"
                    >
                      {y.year}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {d.assignEmpty ? (
              <span className="py-2 text-mute text-sm">
                Todos os livros lidos já têm ano de leitura.
              </span>
            ) : null}
            {d.assignMoreShow ? (
              <MoreButton
                className="mt-1"
                label={d.assignMoreLabel}
                onClick={() => setAssignMore((v) => !v)}
              />
            ) : null}
          </div>
        </section>

        <BarCard
          bars={d.pub}
          onPick={pick("editora")}
          onToggle={toggle("publisher")}
          title="Livros por editora"
        />
      </div>
      <CarouselDots count={6} index={chartCar.index} onGo={chartCar.go} />
    </PageMain>
  );
}
