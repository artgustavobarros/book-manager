import type { NextConfig } from "next";

// Valida as variáveis de ambiente no build e no start.
import "./env";

const nextConfig: NextConfig = {
  // PGlite (WASM) é usado só no servidor em desenvolvimento e testes.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
