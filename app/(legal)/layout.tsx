import { cookies } from "next/headers";
import Link from "next/link";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-7 py-6 max-[640px]:px-5">
          <Link className="flex items-center gap-3 no-underline" href="/entrar">
            <BrandMark />
            <BrandWordmark />
          </Link>
          <ThemeToggle initial={theme} />
        </div>
      </header>

      {children}

      <footer className="mt-auto">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-7 py-8 text-mute text-sm max-[640px]:px-5">
          <span>Bodega Literária</span>
          <nav aria-label="Documentos legais" className="flex gap-5">
            <Link className="font-semibold" href="/privacidade">
              Privacidade
            </Link>
            <Link className="font-semibold" href="/termos">
              Termos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
