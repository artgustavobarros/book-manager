import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-line border-t">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-7 py-4 text-mute text-xs">
        <span>Bodega Literária</span>
        <nav aria-label="Documentos legais" className="flex gap-4">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
        </nav>
      </div>
    </footer>
  );
}
