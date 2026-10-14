import type * as React from "react";

/** Cartão de KPI (Painel e Dados), na tipografia do card "Meta de leitura". */
export const kpiCardClass =
  "flex animate-acv-in snap-start flex-col gap-3 rounded-xl border border-line bg-card px-6 py-5";

/** Título, número e subtítulo do KPI no padrão do card da meta ("de 24 livros lidos"). */
export function KpiContent({
  label,
  value,
  sub,
  aside,
  text,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  aside?: React.ReactNode;
  /** Valor é uma palavra (ex.: um gênero): menor e truncado numa linha. */
  text?: boolean;
}) {
  return (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold text-base text-ink">{label}</span>
        {aside}
      </span>
      {text ? (
        <span
          className="min-w-0 truncate font-bold font-title text-3xl text-ink leading-12"
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </span>
      ) : (
        <span className="font-bold font-title text-5xl text-ink tabular-nums leading-none">
          {value}
        </span>
      )}
      <span className="text-base text-mute leading-[1.4]">{sub}</span>
    </>
  );
}
