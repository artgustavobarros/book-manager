import type { Metadata } from "next";

import { AccountSettings } from "@/components/app/account-settings";

export const metadata: Metadata = { title: "Configurações" };

export default async function Page({
  searchParams,
}: PageProps<"/configuracoes">) {
  const { secao } = await searchParams;
  return (
    <AccountSettings
      initialSection={typeof secao === "string" ? secao : undefined}
    />
  );
}
