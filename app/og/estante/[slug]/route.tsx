import { ImageResponse } from "next/og";

import { OG_SIZE, ShelfOgCard } from "@/components/share/shelf-og-card";
import { ogFor, resolvePublicSelection } from "@/lib/domain/share";
import { fetchCoverDataUrl } from "@/lib/services/og-covers";
import { loadPublicShelf } from "@/lib/services/public-shelf-page";
import { readPublicParams } from "@/lib/validation/public-shelf";

/**
 * Imagem Open Graph do recorte da estante pública (mesmos parâmetros da página).
 * A URL declarada nos metadados leva `v` (versão do acervo), então o cache pode ser longo.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/og/estante/[slug]">
) {
  const { slug } = await params;
  const shelf = await loadPublicShelf(slug);
  if (!shelf) {
    return new Response("Não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const sel = resolvePublicSelection(
    readPublicParams(new URL(request.url).searchParams),
    shelf.books
  );
  const og = ogFor(shelf.books, shelf.owner.name, sel);
  const covers = await Promise.all(
    og.covers.map(async (c) => ({
      ...c,
      coverUrl: await fetchCoverDataUrl(c.coverUrl),
    }))
  );
  return new ImageResponse(<ShelfOgCard og={{ ...og, covers }} />, {
    ...OG_SIZE,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
