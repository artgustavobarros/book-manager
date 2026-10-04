/** ISBN: detecção na busca e conversão 13 → 10 (capa da Amazon). */

/** Retorna o ISBN limpo (10 ou 13 dígitos) se a busca for um ISBN; senão null. */
export function isbnOf(q: string): string | null {
  const s = String(q).replace(/[-\s]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(s) ? s : null;
}

/** ISBN-10 a partir de um ISBN-13 com prefixo 978 (ou o próprio ISBN-10). */
export function isbn10(s: string): string | null {
  if (s.length === 10) {
    return s;
  }
  if (!s.startsWith("978")) {
    return null;
  }
  const core = s.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * Number(core[i]);
  }
  const c = (11 - (sum % 11)) % 11;
  return core + (c === 10 ? "X" : String(c));
}
