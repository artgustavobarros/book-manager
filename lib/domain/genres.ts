import { cmp } from "./text";

/** Sugestões de gênero da obra (lista do standalone). */
export const GENRES = [
  "Romance",
  "Novela",
  "Contos",
  "Poesia",
  "Ficção científica e distopia",
  "Fantasia",
  "Terror e gótico",
  "História",
  "Biografia e memórias",
  "Filosofia",
  "Sociologia",
  "Não-ficção",
  "Ensaio",
  "Teatro",
  "Quadrinhos / HQ",
];

/** Valores distintos (não vazios) ordenados em pt-BR, para os <datalist>. */
export function suggestions(
  values: readonly (string | null | undefined)[],
  base: readonly string[] = []
): string[] {
  return [
    ...new Set([...base, ...values.filter((v): v is string => !!v)]),
  ].sort(cmp);
}
