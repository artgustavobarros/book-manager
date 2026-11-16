import { env } from "@/env";
import { enforceRateLimit, HttpError, json, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { photoRequestSchema } from "@/lib/domain/book-photo";
import {
  readPhotoBody,
  recognizeBookPhoto,
  validatePhoto,
} from "@/lib/services/book-photo";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Só identifica: não grava foto nem livro. O usuário confirma no cadastro atual. */
export const POST = withSession(
  async ({ request }) => {
    if (!env.OPENROUTER_API_KEY) {
      throw new HttpError(
        503,
        "Identificação por foto indisponível. Configure OPENROUTER_API_KEY no servidor."
      );
    }
    const input = photoRequestSchema.parse(await readPhotoBody(request));
    validatePhoto(input.image);
    // A chave é compartilhada: a cota individual não protege a cota do app inteiro.
    for (const rule of [
      { key: "book-photo-minute", max: 18, windowSeconds: 60 },
      {
        key: "book-photo-daily",
        max: env.OPENROUTER_PHOTO_DAILY_LIMIT,
        windowSeconds: 86_400,
      },
    ]) {
      const limit = await enforceRateLimit(db, "shared", rule);
      if (!limit.allowed) {
        return json(
          {
            error:
              "O limite de fotos do app foi atingido. Use a busca por título ou tente mais tarde.",
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(limit.retryAfterSeconds),
              "Cache-Control": "no-store",
            },
          }
        );
      }
    }
    return json(
      await recognizeBookPhoto(input.image, input.model, request.signal),
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  },
  { rateLimit: { key: "book-photo", max: 5, windowSeconds: 60 } }
);
