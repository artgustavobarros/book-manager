import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Valida as variáveis de ambiente no build e no start.
import "./env";

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

export const nextConfig: NextConfig = {
  // PGlite (WASM) é usado só no servidor em desenvolvimento e testes.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Sem o selo "N" do modo dev (atrapalha a comparação visual com o design).
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Envia os source maps ao Sentry no build. Sem SENTRY_AUTH_TOKEN (dev, CI) o envio é pulado.
export default withSentryConfig(nextConfig, {
  org: "arthur-barros-99",
  project: "book-manager",
  telemetry: false,
  // Sem tracing, o onRouterTransitionStart não faz nada; o aviso do build não se aplica.
  suppressOnRouterTransitionStartWarning: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
  },
});
