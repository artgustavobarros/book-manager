import * as z from "zod";

export const goalSchema = z.object({
  target: z
    .number()
    .int("Informe um número inteiro.")
    .min(1, "A meta mínima é 1.")
    .max(1000),
});

export const settingsSchema = z.object({
  sheetUrl: z.string().trim().max(2000).nullable(),
});

export const publicShelfSchema = z.object({
  enabled: z.boolean(),
});

export const sheetSyncSchema = z.object({
  sheetUrl: z.string().trim().min(1).max(2000).optional(),
});

/**
 * Teto de livros numa escrita em lote. O import de backup apaga antes de
 * inserir, então também é o teto de livros por pessoa — e o sync da planilha
 * respeita o mesmo número, senão bastaria sincronizar para passar por cima.
 */
export const MAX_BULK_BOOKS = 20_000;

/** O conteúdo de cada item é validado por `fromBackup`; aqui só forma e tamanho. */
export const importSchema = z
  .array(z.unknown())
  .max(MAX_BULK_BOOKS, "Backup grande demais.");

export const yearParamSchema = z.coerce.number().int().min(1000).max(9999);
