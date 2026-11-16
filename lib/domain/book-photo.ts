import * as z from "zod";

import { isbnOf } from "@/lib/domain/isbn";

/** Lista fechada: o cliente não pode escolher um modelo pago. */
export const PHOTO_MODELS = [
  {
    value: "nvidia/nemotron-3.5-super-vl:free",
    label: "Nemotron 3.5 Super VL · grátis",
  },
] as const;

export const photoModelSchema = z.literal(PHOTO_MODELS[0].value);
export type PhotoModel = z.infer<typeof photoModelSchema>;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTO_BODY_BYTES = 3 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const photoRequestSchema = z.object({
  model: photoModelSchema,
  image: z.string().max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 40),
});

const visibleText = z.string().trim().min(1).max(500).nullable();
export const photoReadingSchema = z.object({
  title: visibleText,
  author: visibleText,
  isbn: z.string().trim().max(40).nullable(),
});
export type PhotoReading = z.infer<typeof photoReadingSchema>;
export interface PhotoRecognition {
  elapsedMs: number;
  model: PhotoModel;
  reading: PhotoReading;
}

/** Um ISBN lido incorretamente não deve substituir a busca por título. */
export function validPhotoIsbn(value: string | null): string | null {
  const isbn = value ? isbnOf(value) : null;
  if (!isbn || (isbn.length === 13 && !/^97[89]/.test(isbn))) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < isbn.length; i++) {
    const digit = isbn[i] === "X" ? 10 : Number(isbn[i]);
    sum += digit * (isbn.length === 10 ? 10 - i : i % 2 === 0 ? 1 : 3);
  }
  return sum % (isbn.length === 10 ? 11 : 10) === 0 ? isbn : null;
}

export function photoSearchQuery(reading: PhotoReading): string {
  return (
    validPhotoIsbn(reading.isbn) ??
    (reading.title
      ? [reading.title, reading.author].filter(Boolean).join(" ")
      : "")
  );
}
