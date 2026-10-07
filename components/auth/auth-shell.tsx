import { cookies } from "next/headers";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** Moldura das telas de autenticação: tema no canto, marca e o cartão (Acervo.dc.html, notAuthed). */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-5 py-10 text-ink">
      <ThemeToggle className="absolute top-4 right-4" initial={theme} />
      <div className="flex items-center gap-3">
        <BrandMark size="lg" />
        <BrandWordmark size="lg" />
      </div>
      {children}
    </div>
  );
}
