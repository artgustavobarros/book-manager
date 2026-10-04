import type { Metadata } from "next";

import { DashboardPage } from "@/components/painel/dashboard-page";

export const metadata: Metadata = { title: "Painel" };

export default function PainelPage() {
  return <DashboardPage />;
}
