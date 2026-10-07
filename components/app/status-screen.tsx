import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";

/**
 * Moldura de "não encontrado" e "erro inesperado": a mesma das telas de autenticação
 * (marca + cartão), sem ler cookies, para servir também ao `error.tsx` (client).
 */
export function StatusScreen({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-5 py-10 text-ink">
      <div className="flex items-center gap-3">
        <BrandMark size="lg" />
        <BrandWordmark size="lg" />
      </div>
      <div className="flex w-full max-w-[400px] animate-[acv-rise_300ms_both] flex-col gap-5 rounded-2xl border border-line bg-card p-7 shadow-card">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-bold font-title text-2xl">{title}</h1>
          <p className="m-0 text-pretty text-mute text-sm">{text}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
