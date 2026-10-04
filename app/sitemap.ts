import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/entrar", appUrl).toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
