import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { listPublicShelfSlugs } from "@/lib/services/public-shelf";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listPublicShelfSlugs(db);
  return [
    {
      url: new URL("/entrar", appUrl).toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/privacidade", appUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: new URL("/termos", appUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...slugs.map((slug) => ({
      url: new URL(`/estante/${slug}`, appUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
