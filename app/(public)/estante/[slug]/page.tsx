import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicShelf } from "@/components/public/public-shelf";
import { appUrl } from "@/lib/app-url";
import {
  ogFor,
  type PublicSelection,
  publicPath,
  resolvePublicSelection,
} from "@/lib/domain/share";
import { loadPublicShelf } from "@/lib/services/public-shelf-page";
import { getSession } from "@/lib/session";
import { SITE_NAME } from "@/lib/site";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { readPublicParams } from "@/lib/validation/public-shelf";

type Props = PageProps<"/estante/[slug]">;

/** Recorte inicial vindo da URL: formato pelo Zod, existência pelos livros públicos. */
async function selectionFrom(
  searchParams: Props["searchParams"],
  books: Parameters<typeof resolvePublicSelection>[1]
): Promise<PublicSelection> {
  const sp = await searchParams;
  const first = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };
  return resolvePublicSelection(readPublicParams({ get: first }), books);
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const shelf = await loadPublicShelf(slug);
  if (!shelf) {
    return { robots: { index: false, follow: false } };
  }
  const sel = await selectionFrom(searchParams, shelf.books);
  const og = ogFor(shelf.books, shelf.owner.name, sel);
  const path = publicPath(slug, sel);
  const image =
    "/og" + path + (path.includes("?") ? "&" : "?") + "v=" + shelf.version;
  return {
    title: og.title,
    description: og.description,
    alternates: { canonical: path },
    robots: { index: false, follow: false },
    // Substitui o openGraph do layout raiz por inteiro: repete os campos fixos.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "pt_BR",
      url: path,
      title: og.title,
      description: og.description,
      images: [{ url: image, width: 1200, height: 630, alt: og.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      images: [image],
    },
  };
}

/** Estante pública em modo leitura (sem sessão); o recorte da URL é só o estado inicial. */
export default async function PublicShelfPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const shelf = await loadPublicShelf(slug);
  if (!shelf) {
    notFound();
  }
  const [sel, session, jar] = await Promise.all([
    selectionFrom(searchParams, shelf.books),
    getSession(),
    cookies(),
  ]);
  let viewer: "anon" | "owner" | "other" = "anon";
  if (session) {
    viewer = session.user.id === shelf.ownerId ? "owner" : "other";
  }
  return (
    <PublicShelf
      books={shelf.books}
      initial={sel}
      origin={appUrl}
      owner={shelf.owner}
      slug={slug}
      theme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      viewer={viewer}
    />
  );
}
