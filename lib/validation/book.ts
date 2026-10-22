/**
 * Schemas do livro, compartilhados entre o formulário (React Hook Form) e a API.
 * - `bookFieldsSchema`: JSON tipado aceito pela API.
 * - `bookFormSchema`: valores do formulário (strings dos inputs) → mesmos tipos da API.
 */
import { z } from "zod";

import { toIsoDate } from "@/lib/domain/backup";
import {
  AUTHOR_GENDERS,
  BOOK_INT_MAX,
  BOOK_STATUSES,
} from "@/lib/domain/types";

const MAX_TEXT = 300;

/** Texto opcional: vazio vira null. */
const textRule = (max = MAX_TEXT) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v ? v : null));

const optionalText = (max = MAX_TEXT) =>
  textRule(max)
    .nullable()
    .transform((v) => v ?? null);

const positiveInt = (label: string, max: number) =>
  z
    .number({ error: `${label}: informe um número inteiro.` })
    .int(`${label}: informe um número inteiro.`)
    .min(1, `${label}: precisa ser maior que zero.`)
    .max(max, `${label}: valor muito alto.`)
    .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((s) => toIsoDate(s) === s, "Data inválida.")
  .nullable();

const coverUrlText = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "Use um link http(s) para a capa."
  )
  .transform((v) => (v ? v : null));

const coverUrl = coverUrlText.nullable().transform((v) => v ?? null);

export const bookFieldsSchema = z.object({
  orderNo: positiveInt("Nº de ordem", BOOK_INT_MAX.orderNo),
  title: z
    .string()
    .trim()
    .min(1, "Informe o título.")
    .max(MAX_TEXT, `Máximo de ${MAX_TEXT} caracteres.`),
  author: optionalText(),
  authorGender: z.enum(AUTHOR_GENDERS).nullable(),
  authorEthnicity: optionalText(100),
  nationality: optionalText(100),
  publisher: optionalText(),
  genre: optionalText(100),
  yearPublished: positiveInt("Ano de lançamento", BOOK_INT_MAX.yearPublished),
  pages: positiveInt("Páginas", BOOK_INT_MAX.pages),
  acquiredOn: isoDate,
  status: z.enum(BOOK_STATUSES),
  borrower: optionalText(100),
  yearRead: positiveInt("Ano em que foi lido", BOOK_INT_MAX.yearRead),
  notes: optionalText(20_000),
  coverUrl,
  favorite: z.boolean(),
  coverCheckedAt: z.iso.datetime({ offset: true }).nullable(),
});

export type BookFieldsInput = z.input<typeof bookFieldsSchema>;
export type BookFieldsOutput = z.output<typeof bookFieldsSchema>;

/** Criação: só o título é obrigatório; o resto assume os padrões do modelo. */
export const bookCreateSchema = bookFieldsSchema
  .partial()
  .required({ title: true });

/** Atualização parcial de um livro. */
export const bookPatchSchema = bookFieldsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nada para atualizar.");

/** Atualização em lote (capas automáticas, ano lido): até 100 livros. */
export const bookBatchSchema = z
  .array(
    bookFieldsSchema.partial().extend({
      id: z.uuid(),
      onlyIfNoCover: z.boolean().optional(),
    })
  )
  .min(1)
  .max(100);

// --- Formulário ------------------------------------------------------------

const intField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d+$/.test(v),
      `${label}: informe um número inteiro.`
    )
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(positiveInt(label, max));

const textField = (max = MAX_TEXT) => textRule(max);

export const bookFormSchema = z
  .object({
    orderNo: intField("Nº de ordem", BOOK_INT_MAX.orderNo),
    title: z.string().trim().min(1, "Informe o título.").max(MAX_TEXT),
    author: textField(),
    authorGender: z
      .union([z.enum(AUTHOR_GENDERS), z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    authorEthnicity: textField(100),
    nationality: textField(100),
    publisher: textField(),
    genre: textField(100),
    yearPublished: intField("Ano de lançamento", BOOK_INT_MAX.yearPublished),
    pages: intField("Páginas", BOOK_INT_MAX.pages),
    acquiredOn: z
      .string()
      .transform((v) => (v ? v : null))
      .pipe(isoDate),
    status: z.enum(BOOK_STATUSES),
    borrower: textField(100),
    yearRead: intField("Ano em que foi lido", BOOK_INT_MAX.yearRead),
    notes: textField(20_000),
    coverUrl: coverUrlText,
  })
  .transform((v) => ({
    ...v,
    borrower: v.status === "emprestado" ? v.borrower : null,
  }));

export type BookFormValues = z.input<typeof bookFormSchema>;
export type BookFormOutput = z.output<typeof bookFormSchema>;
