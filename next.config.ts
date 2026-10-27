import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Valida as variáveis de ambiente no build e no start.
import "./env";

const nextConfig: NextConfig = {
  // PGlite (WASM) é usado só no servidor em desenvolvimento e testes.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Sem o selo "N" do modo dev (atrapalha a comparação visual com o design).
  devIndicators: false,
};

// Envia os source maps ao Sentry no build. Sem SENTRY_AUTH_TOKEN (dev, CI) o envio é pulado.
export default withSentryConfig(nextConfig, {
  org: "arthur-barros-99",
  project: "book-manager",
  telemetry: false,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
  },
});
