import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { env } from "@/env";
import { auth, type Session } from "@/lib/auth";
import { type DB, db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Não encontrado.");
export const badRequest = (message: string) => new HttpError(400, message);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("JSON inválido.");
  }
  return schema.parse(body);
}

type Handler<C> = (ctx: {
  request: Request;
  session: Session;
  userId: string;
  params: C;
}) => Promise<Response>;

export interface RateLimitRule {
  key: string;
  max: number;
  windowSeconds?: number;
}

export interface SessionRouteOptions {
  rateLimit?: RateLimitRule;
}

const e2eMode =
  env.E2E_MODE === "1" && env.DATABASE_URL.startsWith("pglite://");

export async function enforceRateLimit(
  database: DB,
  userId: string,
  rule: RateLimitRule,
  now = Date.now()
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const windowMs = (rule.windowSeconds ?? 60) * 1000;
  const max = e2eMode ? rule.max * 20 : rule.max;
  const bucketKey = `${rule.key}:${userId}`;

  const [row] = await database
    .insert(rateLimit)
    .values({
      id: bucketKey,
      key: bucketKey,
      count: 1,
      lastRequest: now,
    })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${now}::bigint - ${rateLimit.lastRequest} >= ${windowMs}::bigint then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: sql`case when ${now}::bigint - ${rateLimit.lastRequest} >= ${windowMs}::bigint then ${now}::bigint else ${rateLimit.lastRequest} end`,
      },
    })
    .returning({
      count: rateLimit.count,
      lastRequest: rateLimit.lastRequest,
    });

  if (row.count > max) {
    const remainingMs = Math.max(1000, windowMs - (now - row.lastRequest));
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Route Handler autenticado: resolve a sessão (401 sem ela) e converte erros
 * de validação (400) e HttpError no status correspondente. O `userId` vem só da sessão.
 */
export function withSession<P = Record<string, never>>(
  handler: Handler<P>,
  options?: SessionRouteOptions
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return json({ error: "Não autenticado." }, { status: 401 });
      }
      if (options?.rateLimit) {
        const limit = await enforceRateLimit(
          db,
          session.user.id,
          options.rateLimit
        );
        if (!limit.allowed) {
          return json(
            {
              error: "Muitas tentativas. Aguarde um momento e tente novamente.",
            },
            {
              status: 429,
              headers: { "Retry-After": String(limit.retryAfterSeconds) },
            }
          );
        }
      }
      const params = (await context?.params) ?? ({} as P);
      return await handler({
        request,
        session,
        userId: session.user.id,
        params,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return json(
          {
            error: error.issues[0]?.message ?? "Dados inválidos.",
            issues: error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          },
          { status: 400 }
        );
      }
      if (error instanceof HttpError) {
        return json({ error: error.message }, { status: error.status });
      }
      console.error("[api]", error);
      return json({ error: "Erro inesperado." }, { status: 500 });
    }
  };
}
