"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useBooks } from "@/hooks/use-books";
import { type AnnualCount, acquisitionsByYear } from "@/lib/domain/insights";
import { nf } from "@/lib/domain/text";
import { AcquisitionYearChart } from "./acquisition-year-chart";

// Cinco formatos para o mesmo gráfico, selecionáveis por ?variant=.
const variants = [
  [
    "colunas",
    "Colunas",
    "Compare os anos",
    "Cada coluna representa um ano e parte de zero. A altura deixa as diferenças de volume fáceis de comparar.",
  ],
  [
    "barras",
    "Barras horizontais",
    "Leia os números no celular",
    "Os anos e totais têm espaço para respirar, mesmo em uma tela estreita. Com muitos anos, a lista fica mais longa.",
  ],
  [
    "linha",
    "Linha",
    "Veja a tendência",
    "A linha destaca as subidas e quedas. Os pontos mostram os totais reais; o trecho entre eles serve apenas para guiar o olho.",
  ],
  [
    "hastes",
    "Hastes com pontos",
    "Compare com menos preenchimento",
    "Os pontos marcam as quantidades. As hastes mantêm a referência em zero, mas as diferenças ficam menos evidentes do que nas colunas.",
  ],
  [
    "quadrados",
    "Quadrados",
    "Conte livro por livro",
    "Cada quadrado representa um livro. É fácil contar poucos; com dezenas de aquisições por ano, o gráfico fica mais denso.",
  ],
] as const;

type Variant = (typeof variants)[number][0];
const choices = variants.map(([id, label]) => [id, label] as const);

function chartScale(series: AnnualCount[]) {
  const max = series.reduce(
    (highest, { count }) => Math.max(highest, count),
    1
  );
  const step = Math.ceil(max / 4);
  const intervals = Math.ceil((max + 1) / step);
  return { ceiling: step * intervals, intervals, step };
}

function RowChart({
  ceiling,
  series,
  units,
}: {
  ceiling: number;
  series: AnnualCount[];
  units: boolean;
}) {
  return (
    <ul className="m-0 grid list-disc grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-2 p-0 text-sm tabular-nums sm:gap-x-4">
      {series.map(({ year, count }) => (
        <li
          className="col-span-full grid grid-cols-subgrid items-center"
          key={year}
        >
          <span className="text-mute">{year}</span>
          {units ? (
            <span
              aria-hidden="true"
              className="flex flex-wrap gap-1 border-line2 border-l pl-1"
            >
              {Array.from({ length: count }, (_, index) => (
                <span className="size-2.5 rounded-[2px] bg-acc" key={index} />
              ))}
            </span>
          ) : (
            <span aria-hidden="true" className="flex h-3 border-line2 border-l">
              <span
                className="rounded-r-[2px] bg-acc"
                style={{ width: `${(count / ceiling) * 100}%` }}
              />
            </span>
          )}
          <span className="text-right font-semibold">
            {nf(count)}
            <span className="sr-only">
              {count === 1 ? " livro" : " livros"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function changeVariant(variant: Variant) {
  const url = new URL(window.location.href);
  url.searchParams.set("variant", variant);
  window.history.replaceState(null, "", url);
}

function cycleVariant(index: number, direction: -1 | 1) {
  const choice =
    variants[(index + direction + variants.length) % variants.length];
  changeVariant(choice[0]);
}

export function AcquisitionPreview() {
  const books = useBooks();
  const { year: currentYear } = useApp();
  const series = useMemo(() => acquisitionsByYear(books), [books]);
  const scale = chartScale(series);
  const requestedVariant = useSearchParams().get("variant");
  const index = Math.max(
    0,
    variants.findIndex(([id]) => id === requestedVariant)
  );
  const [variant, label, takeaway, explanation] = variants[index];
  const total = series.reduce((sum, { count }) => sum + count, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !(event.key === "ArrowLeft" || event.key === "ArrowRight") ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, [contenteditable], [data-chart-scroll]"
          ))
      ) {
        return;
      }
      event.preventDefault();
      cycleVariant(index, event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index]);

  return (
    <PageMain>
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 sm:pb-12">
        <header className="flex flex-col gap-2.5">
          <Link
            className="inline-flex w-fit items-center gap-1.5 rounded-sm font-semibold text-mute text-sm no-underline hover:text-ink"
            href="/dados"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Voltar para Dados
          </Link>
          <h1 className="m-0 font-bold font-title text-3xl sm:text-4xl">
            Livros adquiridos por ano
          </h1>
          <p className="m-0 max-w-[62ch] text-mute text-sm leading-relaxed">
            Prévia: compare cinco formas de mostrar os mesmos dados do seu
            acervo.
          </p>
        </header>

        <Segmented<Variant>
          className="w-fit max-w-full flex-wrap rounded-xl p-1"
          itemClassName="min-h-11 rounded-lg px-3 text-sm"
          label="Formato do gráfico"
          onChange={changeVariant}
          options={choices}
          value={variant}
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <section
            aria-labelledby="preview-chart-title"
            className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                className="m-0 font-semibold text-lg"
                id="preview-chart-title"
              >
                {label}
              </h2>
              <span className="text-mute text-sm tabular-nums">
                {nf(total)}{" "}
                {total === 1
                  ? "livro com data registrada"
                  : "livros com data registrada"}
              </span>
            </div>
            {series.length ? (
              <>
                <div className="min-w-0 pt-2" data-chart-scroll="">
                  {variant === "barras" || variant === "quadrados" ? (
                    <RowChart
                      ceiling={scale.ceiling}
                      series={series}
                      units={variant === "quadrados"}
                    />
                  ) : (
                    <AcquisitionYearChart
                      currentYear={currentYear}
                      scale={scale}
                      series={series}
                      variant={variant}
                    />
                  )}
                </div>
                <p className="m-0 text-mute text-xs leading-relaxed">
                  {books.length > total
                    ? `${nf(books.length - total)} sem data de aquisição. `
                    : ""}
                  Só contam as aquisições registradas no acervo.
                </p>
              </>
            ) : (
              <p className="m-0 text-mute text-sm">
                Nenhum livro tem data de aquisição registrada.
              </p>
            )}
          </section>

          <aside className="flex flex-col gap-5 py-1 lg:pl-3">
            <div className="flex flex-col gap-2">
              <h2 className="m-0 font-semibold text-base">{takeaway}</h2>
              <p className="m-0 text-mute text-sm leading-relaxed">
                {explanation}
              </p>
            </div>
            <div className="flex flex-col gap-2 border-line border-t pt-4">
              <h2 className="m-0 font-semibold text-base">
                Recomendação: colunas
              </h2>
              <p className="m-0 text-mute text-sm leading-relaxed">
                Cada ano tem sua própria coluna, então dá para comparar volumes
                sem depender de cor ou de uma linha de tendência.
              </p>
              <a
                className="w-fit rounded-sm font-semibold text-sm underline-offset-4"
                href="https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type#stock-or-flow-data-in-change-over-time-charts"
              >
                Guia do ONS sobre séries no tempo
              </a>
            </div>
          </aside>
        </div>
      </div>

      <div
        aria-label="Percorrer formatos"
        className="mx-auto flex w-fit items-center gap-1 rounded-xl bg-card px-1 shadow-popover sm:fixed sm:bottom-4 sm:left-1/2 sm:z-20 sm:mx-0 sm:-translate-x-1/2"
        role="group"
      >
        <Button
          aria-label="Formato anterior"
          onClick={() => cycleVariant(index, -1)}
          size="lg"
          variant="ghost"
        >
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-28 text-center font-semibold text-sm tabular-nums"
        >
          Opção {index + 1} de {variants.length}
        </span>
        <Button
          aria-label="Próximo formato"
          onClick={() => cycleVariant(index, 1)}
          size="lg"
          variant="ghost"
        >
          <ArrowRightIcon aria-hidden="true" data-icon="inline-start" />
        </Button>
      </div>
    </PageMain>
  );
}
