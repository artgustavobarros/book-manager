import type { Metadata } from "next";

import { InsightsPage } from "@/components/dados/insights-page";

export const metadata: Metadata = { title: "Dados do acervo" };

export default function DadosPage() {
  return <InsightsPage />;
}
