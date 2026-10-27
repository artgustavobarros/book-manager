/**
 * Opções do Sentry comuns a navegador, Node e Edge.
 *
 * O DSN é público: só identifica o projeto, não autentica. O envio fica ligado só
 * em deploys da Vercel (produção e previews); dev, CI e E2E não mandam nada.
 *
 * Lê `process.env` direto, sem `@/env`: este módulo entra no JS inicial do
 * navegador, e o T3 Env levaria o zod junto.
 */
// biome-ignore lint/nursery/noJsRestrictedProperties: @/env would pull zod into the initial browser JS.
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

export const sentryOptions = {
  dsn: "https://b1ec0fa00a3016649ee9786861efcf75@o4508295775977472.ingest.us.sentry.io/4508295806189568",
  enabled: vercelEnv !== undefined,
  environment: vercelEnv,
};
