import { cn } from "cn";

import type { AnnualCount } from "@/lib/domain/insights";
import { nf } from "@/lib/domain/text";

export function AcquisitionYearChart({
  scale,
  series,
  variant = "colunas",
  currentYear,
}: {
  scale: { ceiling: number; intervals: number; step: number };
  series: AnnualCount[];
  variant?: "colunas" | "hastes" | "linha";
  currentYear: number;
}) {
  const { ceiling, intervals, step } = scale;
  const points =
    variant === "linha"
      ? series
          .map(
            ({ count }, index) =>
              `${(((index + 0.5) / series.length) * 1000).toFixed(2)},${(100 - (count / ceiling) * 100).toFixed(2)}`
          )
          .join(" ")
      : "";
  const ticks = Array.from({ length: intervals + 1 }, (_, index) => ({
    label: nf(index * step),
    bottom: `${(index / intervals) * 100}%`,
  }));
  const labelWidth = Math.max(17, nf(ceiling).length * 8);

  return (
    <div
      aria-label="Contagem de livros por ano"
      className="overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-acc"
      data-chart-scroll=""
      role="group"
      tabIndex={0}
    >
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 px-0.5 pt-6 pb-6 [--year-label-width:25px] sm:[--year-label-width:34px]"
        style={{
          minWidth: `calc(${labelWidth + 12}px + ${series.length} * max(var(--year-label-width), ${labelWidth}px))`,
        }}
      >
        <div
          aria-hidden="true"
          className="relative h-44 text-mute text-xs tabular-nums sm:h-56"
          style={{ width: labelWidth }}
        >
          {ticks.map(({ label, bottom }) => (
            <span
              className="absolute right-0 translate-y-1/2"
              key={label}
              style={{ bottom }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="relative h-44 sm:h-56">
          {ticks.map(({ label, bottom }, index) => (
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-x-0 border-t",
                index === 0 ? "border-line2" : "border-line"
              )}
              key={label}
              style={{ bottom }}
            />
          ))}
          {variant === "linha" && series.length > 1 ? (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full text-acc"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 1000 100"
            >
              <polyline
                points={points}
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          <ul
            className="m-0 grid h-full list-disc p-0"
            style={{
              gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`,
            }}
          >
            {series.map(({ year, count }, index) => (
              <li
                className="relative flex min-w-0 items-end justify-center"
                key={year}
              >
                <span className="sr-only">
                  {year}: {nf(count)} {count === 1 ? "livro" : "livros"}
                </span>
                <div
                  aria-hidden="true"
                  className={cn(
                    "relative",
                    variant === "colunas"
                      ? "w-[66%] max-w-11 rounded-t-[3px] bg-acc"
                      : "w-0.5",
                    variant === "hastes" && "bg-acc/45"
                  )}
                  style={{ height: `${(count / ceiling) * 100}%` }}
                >
                  {variant === "colunas" ? null : (
                    <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc" />
                  )}
                  <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 font-semibold text-xs tabular-nums">
                    {nf(count)}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-full pt-2 text-[11px] tabular-nums sm:text-xs",
                    year === currentYear ? "font-bold text-ink" : "text-mute"
                  )}
                >
                  {index === 0 || index === series.length - 1 ? (
                    year
                  ) : (
                    <>
                      <span className="sm:hidden">
                        ’{String(year).slice(-2)}
                      </span>
                      <span className="max-sm:hidden">{year}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
