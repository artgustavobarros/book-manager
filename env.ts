import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

/**
 * Variáveis de ambiente validadas (T3 Env). Nenhum outro módulo lê `process.env`,
 * exceto `lib/sentry.ts` (`NEXT_PUBLIC_VERCEL_ENV`), que fica fora para não levar o
 * zod ao JS inicial do navegador.
 *
 * DATABASE_URL aceita `postgres://…` (Neon em produção) ou `pglite://<dir>` /
 * `pglite://memory` (Postgres embutido para desenvolvimento e testes).
 */
export const env = createEnv({
  server: {
    /** Conexão direta (sem pooler) do Neon, usada só pelas migrations quando existir. */
    DATABASE_URL_UNPOOLED: z.string().optional(),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (v) => /^(postgres(ql)?|pglite):\/\//.test(v),
        "Use postgres:// ou pglite://"
      ),
    BETTER_AUTH_SECRET: z.string().min(32),
    /**
     * URL pública do app. Na Vercel pode ficar vazia: produção usa o domínio de
     * produção do projeto e os previews usam a VERCEL_URL do deploy.
     */
    BETTER_AUTH_URL: z.url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    /** Segredo enviado pela Vercel no header Authorization das invocações cron. */
    CRON_SECRET: z.string().min(16).optional(),
    EMAIL_TRANSPORT: z.enum(["gmail", "outbox", "console"]).default("gmail"),
    /** Arquivo da caixa de saída de teste (EMAIL_TRANSPORT=outbox). */
    EMAIL_OUTBOX_FILE: z.string().optional(),
    SMTP_USER: z.email().optional(),
    SMTP_PASS: z.string().min(1).optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    /** Domínio de produção do projeto (sem protocolo), definido pela Vercel. */
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    /** Só para testes visuais: instante fixo usado pelo servidor como "agora". */
    FIXED_NOW: z.iso.datetime({ offset: true }).optional(),
    /** Aumenta o limite de login só no PGlite descartável dos testes E2E. */
    E2E_MODE: z.literal("1").optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
