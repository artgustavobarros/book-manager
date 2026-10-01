import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";

export const metadata: Metadata = { title: "Esqueci minha senha · Bodega Literária" };

export default function EsqueciSenhaPage() {
  return (
    <AuthShell>
      <ForgotPasswordCard />
    </AuthShell>
  );
}
