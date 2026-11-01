"use client";

import { usePathname } from "next/navigation";

import DadosLoading from "@/app/(app)/dados/loading";
import EstanteLoading from "@/app/(app)/estante/loading";
import { PageMain } from "@/components/app/app-shell";
import { kpiCardClass } from "@/components/app/kpi";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_KEYS = ["kpi-1", "kpi-2", "kpi-3", "kpi-4"] as const;
const YEAR_READ_KEYS = [
  "yr-1",
  "yr-2",
  "yr-3",
  "yr-4",
  "yr-5",
  "yr-6",
] as const;
const SIDE_CARD_KEYS = ["lendo-agora", "ultimos-adicionados"] as const;
const BOOK_ROW_KEYS = ["row-1", "row-2", "row-3"] as const;

function PainelSkeleton() {
  return (
    <PageMain>
      <div aria-busy="true" className="contents" role="status">
        <span className="sr-only">Carregando painel…</span>

        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-44 self-end" />
          <Skeleton className="h-9 w-64" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
          {KPI_KEYS.map((key) => (
            <div className={kpiCardClass} key={key}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <section className="flex min-w-0 flex-[2_1_460px] flex-col gap-5 rounded-xl border border-line bg-card px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="ml-auto h-9 w-36 rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex flex-wrap justify-between gap-3">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-soft border-t pt-4">
              <Skeleton className="h-3 w-24" />
              <div className="flex flex-wrap gap-2">
                {YEAR_READ_KEYS.map((key) => (
                  <Skeleton className="h-14 w-9 rounded" key={key} />
                ))}
              </div>
            </div>
          </section>

          {SIDE_CARD_KEYS.map((cardKey) => (
            <section
              className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-xl border border-line bg-card px-6 py-5"
              key={cardKey}
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex flex-col gap-3">
                {BOOK_ROW_KEYS.map((rowKey) => (
                  <div className="flex items-center gap-3" key={rowKey}>
                    <Skeleton className="h-12 w-8 flex-none rounded" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                    <Skeleton className="h-7 w-16 flex-none rounded-md" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageMain>
  );
}

export function RouteSkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/estante")) {
    return <EstanteLoading />;
  }
  if (pathname.startsWith("/dados")) {
    return <DadosLoading />;
  }
  return <PainelSkeleton />;
}

/**
 * Em 3G, antes de o segmento `/estante` ou `/dados` baixar pela 1ª vez, é este boundary
 * pai (`app/(app)/loading.tsx`) que o Next.js exibe. Delegamos por `usePathname()` para
 * nunca mostrar o skeleton do Painel ao abrir Estante ou Dados.
 */
export default function AppLoading() {
  const pathname = usePathname();
  return <RouteSkeleton pathname={pathname} />;
}
