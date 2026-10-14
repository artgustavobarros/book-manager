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
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold text-base text-ink">{label}</span>
        {aside}
      </span>
      <span className="font-bold font-title text-5xl text-ink tabular-nums leading-none">
        {value}
      </span>
      <span className="text-base text-mute leading-[1.4]">{sub}</span>
    </>
  );
}
