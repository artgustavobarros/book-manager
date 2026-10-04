import type { Metadata } from "next";
import Link from "next/link";

import { StatusScreen } from "@/components/app/status-screen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      text="O endereço não existe ou foi mudado. Volte ao Painel para continuar."
      title="Página não encontrada"
    >
      <Button asChild size="lg">
        <Link className="text-card no-underline hover:text-card" href="/">
          Voltar ao Painel
        </Link>
      </Button>
    </StatusScreen>
  );
}
