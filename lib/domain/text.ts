/** Utilitários de texto e formatação portados do standalone (Acervo.dc.html). */

/** Normaliza para comparação: sem acentos, minúsculo, só [a-z0-9#] separados por espaço. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, " ")
    .trim();
}

/** Comparação de texto em pt-BR, sem diferenciar acentos nem maiúsculas. */
export function cmp(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return (a || "").localeCompare(b || "", "pt-BR", { sensitivity: "base" });
}

/** Inicial da capa gerada: primeira letra do título ignorando artigos iniciais. */
export function initial(title: string | null | undefined): string {
  return (title || "?")
    .replace(/^(o|a|os|as|the)\s+/i, "")
    .charAt(0)
    .toUpperCase();
}

/** "2023-04-12" → "12 abr 2023"; vazio ou inválido → "—". */
export function fmtDate(d: string | null | undefined): string {
  if (!d) {
    return "—";
  }
  const x = new Date(d + "T00:00:00");
  if (Number.isNaN(x.getTime())) {
    return "—";
  }
  return x
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ de /g, " ")
    .replace(".", "");
}

/** Número formatado em pt-BR (separador de milhar). */
export function nf(x: number): string {
  return Number(x).toLocaleString("pt-BR");
}

/** Remove espaços e devolve null para vazio. */
export function clean(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v ? v : null;
}

/** Primeira letra maiúscula (usado em nacionalidade na ficha). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
