/**
 * Formato do endereço da estante pública: slug e parâmetros iniciais do recorte.
 * Valor fora do formato vira "sem filtro" (`catch`), nunca erro: o link continua abrindo.
 * Se o gênero ou o livro existem na estante é checado depois, em `resolvePublicSelection`.
 */
import { z } from "zod";

import { PUBLIC_READINGS, type PublicSelection } from "@/lib/domain/share";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const publicSlugSchema = z.string().max(120).regex(SLUG);

export const publicParamsSchema = z.object({
  genero: publicSlugSchema.or(z.literal("")).catch(""),
  leitura: z.enum([...PUBLIC_READINGS, ""]).catch(""),
  livro: z.uuid().or(z.literal("")).catch(""),
});

type ParamSource = { get(name: string): string | null };

/** `?genero=&leitura=&livro=` → recorte só com valores bem formados. */
export function readPublicParams(params: ParamSource): PublicSelection {
  const p = publicParamsSchema.parse({
    genero: params.get("genero") ?? "",
    leitura: params.get("leitura") ?? "",
    livro: params.get("livro") ?? "",
  });
  return { genre: p.genero, reading: p.leitura, bookId: p.livro };
}

/** Slugs gerados pelo app: só minúsculas, dígitos e hífens entre eles. */
export function isPublicSlug(slug: string): boolean {
  return publicSlugSchema.safeParse(slug).success;
}
