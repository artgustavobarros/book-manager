import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { auth, type Session } from "@/lib/auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Não encontrado.");
export const badRequest = (message: string) => new HttpError(400, message);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("JSON inválido.");
  }
  return schema.parse(body);
}

type Handler<C> = (ctx: { request: Request; session: Session; userId: string; params: C }) => Promise<Response>;

/**
 * Route Handler autenticado: resolve a sessão (401 sem ela) e converte erros
 * de validação (400) e HttpError no status correspondente. O `userId` vem só da sessão.
 */
export function withSession<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: Request, context: { params: Promise<P> }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return json({ error: "Não autenticado." }, { status: 401 });
      const params = (await context?.params) ?? ({} as P);
      return await handler({ request, session, userId: session.user.id, params });
    } catch (error) {
      if (error instanceof ZodError) {
        return json(
          { error: error.issues[0]?.message ?? "Dados inválidos.", issues: error.issues.map((i) => ({ path: i.path, message: i.message })) },
          { status: 400 },
        );
      }
      if (error instanceof HttpError) return json({ error: error.message }, { status: error.status });
      console.error("[api]", error);
      return json({ error: "Erro inesperado." }, { status: 500 });
    }
  };
}
