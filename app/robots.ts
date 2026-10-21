import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";

/**
 * Só a tela de entrada é indexável: o resto exige conta ou carrega um token de e-mail.
 * Assets e imagens de metadados ficam liberados para o robô renderizar a página.
 * Estantes públicas (`/estante/…`, nunca `/estante`) e suas imagens OG (`/og/`) ficam
 * liberadas para robôs de preview que respeitam o robots.txt (como o do X); elas
 * declaram `noindex`, então não entram em buscadores.
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
