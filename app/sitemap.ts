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
    ...slugs.map((slug) => ({
      url: new URL(`/estante/${slug}`, appUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
