import { env } from "@/env";

/** URL do próprio deploy na Vercel (previews). */
export const vercelUrl = env.VERCEL_URL
  ? `https://${env.VERCEL_URL}`
  : undefined;

/** URL pública do app. Produção: BETTER_AUTH_URL. Previews da Vercel: a URL do próprio deploy. */
export const appUrl =
  env.BETTER_AUTH_URL ?? vercelUrl ?? "http://localhost:3000";
