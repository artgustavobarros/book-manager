import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";

/**
 * A tela de entrada e as estantes publicadas são indexáveis. As outras páginas exigem
 * conta ou carregam um token de e-mail.
 * Assets e imagens de metadados ficam liberados para o robô renderizar a página.
 * Estantes públicas (`/estante/…`, nunca `/estante`) e suas imagens OG (`/og/`) ficam
 * liberadas para buscadores e robôs de preview quando a estante está publicada.
 * Estantes privadas não resolvem a rota e não entram no sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/entrar",
        "/_next/",
        "/fonts/",
        "/icon.svg",
        "/icon.png",
        "/apple-icon.png",
        "/opengraph-image",
        "/estante/",
        "/og/",
      ],
      disallow: "/",
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  };
}
