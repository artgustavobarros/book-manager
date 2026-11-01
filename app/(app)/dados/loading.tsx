import { PageMain } from "@/components/app/app-shell";
import { kpiCardClass } from "@/components/app/kpi";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_KEYS = ["dk-1", "dk-2", "dk-3", "dk-4"] as const;
const BIG_BOOK_KEYS = ["bb-1", "bb-2", "bb-3"] as const;
const READING_SEG_KEYS = ["rs-1", "rs-2", "rs-3", "rs-4"] as const;
const SITUATION_SEG_KEYS = ["ss-1", "ss-2", "ss-3"] as const;
const BAR_CARD_KEYS = ["genero", "nacionalidade"] as const;
const BAR_ROW_KEYS = ["br-1", "br-2", "br-3", "br-4", "br-5", "br-6"] as const;

export default function DadosLoading() {
  return (
    <PageMain>
      <div aria-busy="true" className="contents" role="status">
        <span className="sr-only">Carregando dados…</span>

        <Skeleton className="h-9 w-28" />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {KPI_KEYS.map((key) => (
            <div className={kpiCardClass} key={key}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-full rounded-lg bg-seg p-1" />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-stretch gap-4">
          <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-3 w-44" />
            </div>
            <div className="flex flex-col gap-2 border-soft border-t pt-3">
              <Skeleton className="h-3 w-32" />
              {BIG_BOOK_KEYS.map((key) => (
                <div
                  className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-1.5"
                  key={key}
                >
                  <Skeleton className="h-3 w-4" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Skeleton className="size-[152px] flex-none rounded-full" />
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
                {READING_SEG_KEYS.map((key) => (
                  <div
                    className="grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_40px] items-center gap-3 py-1"
                    key={key}
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 border-soft border-t pt-3">
              <Skeleton className="h-3 w-16" />
              {SITUATION_SEG_KEYS.map((key) => (
                <div
                  className="grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_40px] items-center gap-3 py-1"
                  key={key}
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </section>

          {BAR_CARD_KEYS.map((cardKey) => (
            <section
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-card px-6 py-5"
              key={cardKey}
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex flex-col gap-2">
                {BAR_ROW_KEYS.map((rowKey) => (
                  <div
                    className="grid grid-cols-[minmax(0,152px)_minmax(0,1fr)_32px] items-center gap-3 py-1"
                    key={rowKey}
                  >
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-4 w-6 justify-self-end" />
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
