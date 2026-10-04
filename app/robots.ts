import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";

/**
 * Só a tela de entrada é pública: o resto exige conta ou carrega um token de e-mail.
 * Assets e imagens de metadados ficam liberados para o robô renderizar a página.
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
        "/apple-icon",
        "/opengraph-image",
      ],
      disallow: "/",
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  };
}
