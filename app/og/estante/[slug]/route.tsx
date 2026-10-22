import { ImageResponse } from "next/og";

import { OG_SIZE, ShelfOgCard } from "@/components/share/shelf-og-card";
import {
  ogFor,
  ogImagePath,
  type PublicSelection,
  resolvePublicSelection,
} from "@/lib/domain/share";
import { fetchCoverDataUrl } from "@/lib/services/og-covers";
import { memoOgImage } from "@/lib/services/og-image-cache";
import {
  type LoadedPublicShelf,
  loadPublicShelf,
} from "@/lib/services/public-shelf-page";
import { readPublicParams } from "@/lib/validation/public-shelf";

async function renderPng(
  shelf: LoadedPublicShelf,
  sel: PublicSelection
): Promise<ArrayBuffer> {
  const og = ogFor(shelf.books, shelf.owner.name, sel);
  const covers = await Promise.all(
    og.covers.map(async (c) => ({
      ...c,
      coverUrl: await fetchCoverDataUrl(c.coverUrl),
    }))
  );
  return new ImageResponse(<ShelfOgCard og={{ ...og, covers }} />, {
    ...OG_SIZE,
  }).arrayBuffer();
}

/** `If-None-Match` pode trazer lista, ETag fraco (`W/`) ou `*`. */
function matchesEtag(header: string | null, etag: string): boolean {
  return (header ?? "").split(",").some((tag) => {
    const t = tag.trim();
    return t === "*" || t.replace(/^W\//, "") === etag;
  });
}

/**
 * Imagem Open Graph do recorte da estante pública (mesmos parâmetros da página).
 * Só a URL canônica (recorte válido + `v` da versão atual) renderiza; qualquer outra
 * variação redireciona para ela. Caches podem guardar o PNG, mas revalidam a cada uso
 * (`no-cache` + ETag), então a imagem some assim que a estante deixa de ser pública.
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
  const url = new URL(request.url);
  const sel = resolvePublicSelection(
    readPublicParams(url.searchParams),
    shelf.books
  );
  const canonical = new URL(ogImagePath(slug, sel, shelf.version), url);
  const path = canonical.pathname + canonical.search;
  if (url.pathname + url.search !== path) {
    return new Response(null, {
      status: 307,
      headers: { Location: canonical.href, "Cache-Control": "no-store" },
    });
  }
  const headers = {
    "Cache-Control": "public, no-cache",
    ETag: `"${shelf.version}"`,
  };
  if (matchesEtag(request.headers.get("if-none-match"), headers.ETag)) {
    return new Response(null, { status: 304, headers });
  }
  const png = await memoOgImage(shelf.ownerId + path, () =>
    renderPng(shelf, sel)
  );
  return new Response(png, {
    headers: { ...headers, "Content-Type": "image/png" },
  });
}
