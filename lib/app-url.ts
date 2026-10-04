import { env } from "@/env";

/** URL do próprio deploy na Vercel (previews). */
export const vercelUrl = env.VERCEL_URL
  ? `https://${env.VERCEL_URL}`
  : undefined;

/**
 * Domínio de produção do projeto na Vercel. Em produção a VERCEL_URL é a URL única
 * de cada deploy (protegida pela Deployment Protection), não serve para links públicos.
 */
const productionUrl =
  env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;

/**
 * URL pública do app: BETTER_AUTH_URL quando definida; senão, na Vercel, o domínio
 * de produção (produção) ou a URL do próprio deploy (previews).
 */
export const appUrl =
  env.BETTER_AUTH_URL ?? productionUrl ?? vercelUrl ?? "http://localhost:3000";
