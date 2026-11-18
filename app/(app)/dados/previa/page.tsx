import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AcquisitionPreview } from "@/components/dados/acquisition-preview";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Prévia de gráficos",
  robots: { index: false, follow: false },
};

export default async function ChartPreviewPage({
  searchParams,
}: PageProps<"/dados/previa">) {
  if (env.NODE_ENV !== "development") {
    notFound();
  }

  if ((await searchParams).layout === "abas") {
    redirect("/dados");
  }

  return (
    <Suspense>
      <AcquisitionPreview />
    </Suspense>
  );
}
