"use client";

import { useApp } from "@/components/app/app-provider";
import { PageMain } from "@/components/app/app-shell";
import { LIST_COLUMNS } from "@/components/books/book-row";
import { Skeleton } from "@/components/ui/skeleton";

const READING_CHIP_KEYS = ["rc-1", "rc-2", "rc-3", "rc-4", "rc-5"] as const;
const SITUATION_CHIP_KEYS = ["sc-1", "sc-2", "sc-3", "sc-4"] as const;
const BOOK_CARD_KEYS = [
  "bc-1",
  "bc-2",
  "bc-3",
  "bc-4",
  "bc-5",
  "bc-6",
  "bc-7",
  "bc-8",
  "bc-9",
  "bc-10",
  "bc-11",
  "bc-12",
] as const;

export default function EstanteLoading() {
  const { shelfView } = useApp();
  return (
    <PageMain>
      <div aria-busy="true" className="contents" role="status">
        <span className="sr-only">Carregando estante…</span>

        <div className="flex flex-wrap items-end justify-between gap-4 max-[640px]:flex-nowrap max-[640px]:items-center">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24 max-[640px]:hidden" />
            <h1 className="m-0 font-bold font-title text-3xl">Estante</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-full max-[640px]:size-11" />
            <Skeleton className="h-9 w-40 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-lg max-[640px]:hidden" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {READING_CHIP_KEYS.map((key) => (
              <Skeleton className="h-8 w-24 rounded-full" key={key} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SITUATION_CHIP_KEYS.map((key) => (
              <Skeleton className="h-8 w-28 rounded-full" key={key} />
            ))}
          </div>
        </div>

        {shelfView === "list" ? (
          <div className="overflow-x-auto rounded-xl border border-line bg-card max-[640px]:overflow-visible">
            <div className="flex min-w-[1120px] flex-col max-[640px]:min-w-0">
              <div
                className={
                  LIST_COLUMNS +
                  "border-line border-b bg-hov font-semibold text-mute text-xs max-[640px]:hidden"
                }
              >
                <span>#</span>
                <span />
                <span>Título</span>
                <span>Autor(a)</span>
                <span>Editora</span>
                <span>Gênero / país</span>
                <span>Ano</span>
                <span>Aquisição</span>
                <span>Leitura</span>
                <span />
              </div>
              {BOOK_CARD_KEYS.map((key) => (
                <div
                  className={LIST_COLUMNS + "items-center border-row border-b"}
                  key={key}
                >
                  <Skeleton className="h-3.5 w-6 max-[640px]:hidden" />
                  <Skeleton className="h-11 w-8 rounded max-[640px]:col-start-1 max-[640px]:row-span-3" />
                  <div className="flex flex-col gap-1.5 max-[640px]:col-span-2 max-[640px]:col-start-2 max-[640px]:row-start-1">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3.5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-3/4 max-[640px]:col-span-2 max-[640px]:col-start-2 max-[640px]:row-start-2" />
                  <Skeleton className="h-3.5 w-2/3 max-[640px]:hidden" />
                  <div className="flex flex-col gap-1 max-[640px]:hidden">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3.5 w-10 max-[640px]:hidden" />
                  <Skeleton className="h-3.5 w-16 max-[640px]:hidden" />
                  <Skeleton className="h-8 w-full rounded-lg max-[640px]:col-start-2 max-[640px]:row-start-3" />
                  <div className="flex justify-end gap-1 max-[640px]:col-start-3 max-[640px]:row-start-3">
                    <Skeleton className="size-7 rounded-md max-[640px]:size-9" />
                    <Skeleton className="size-7 rounded-md max-[640px]:size-9" />
                    <Skeleton className="size-7 rounded-md max-[640px]:size-9" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-7 pt-2 max-[641px]:grid-cols-2 max-[641px]:gap-x-3">
            {BOOK_CARD_KEYS.map((key) => (
              <div className="flex min-w-0 flex-col gap-3" key={key}>
                <Skeleton className="aspect-[2/3] w-full rounded-md" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="mt-0.5 h-4 w-16 rounded-full" />
                  <Skeleton className="mt-2 h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageMain>
  );
}
