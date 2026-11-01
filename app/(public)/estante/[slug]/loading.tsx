import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

const PUBLIC_CARD_KEYS = [
  "pc-1",
  "pc-2",
  "pc-3",
  "pc-4",
  "pc-5",
  "pc-6",
  "pc-7",
  "pc-8",
  "pc-9",
  "pc-10",
  "pc-11",
  "pc-12",
] as const;

export default function PublicShelfLoading() {
  return (
    <div
      aria-busy="true"
      className="flex min-h-screen flex-col bg-bg text-ink"
      role="status"
    >
      <span className="sr-only">Carregando estante pública…</span>

      <header className="border-line border-b bg-hdr">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-3 px-7 py-3 max-[640px]:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-ink">
            <BrandMark />
            <BrandWordmark />
          </div>
          <Skeleton className="size-10 flex-none rounded-lg" />
          <Skeleton className="h-10 w-40 flex-none rounded-lg" />
        </div>
      </header>

      <main
        className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-7 pt-8 pb-16 max-[640px]:px-4"
        id="conteudo-principal"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-14 flex-none rounded-full" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-40 rounded-lg" />
            <Skeleton className="h-11 w-28 rounded-lg" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-80 rounded-lg" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-7 max-[641px]:grid-cols-2 max-[641px]:gap-x-3">
          {PUBLIC_CARD_KEYS.map((key) => (
            <div className="flex min-w-0 flex-col gap-3" key={key}>
              <Skeleton className="aspect-[2/3] w-full rounded-md" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
