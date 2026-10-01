/** Nº de ordem por usuário (porta de `withOrders` e `nextOrder` do standalone). */

interface Orderable {
  orderNo: number | null;
  acquiredOn: string | null;
}

/** Próximo nº: maior nº existente + 1 (1 para acervo vazio). */
export function nextOrder(books: readonly Pick<Orderable, "orderNo">[]): number {
  return Math.max(0, ...books.map((b) => b.orderNo || 0)) + 1;
}

/**
 * Atribui números aos livros sem nº, em sequência a partir do maior existente,
 * na ordem de data de aquisição (sem data primeiro, como no standalone).
 */
export function withOrders<T extends Orderable>(books: readonly T[]): T[] {
  let max = Math.max(0, ...books.map((b) => b.orderNo || 0));
  const missing = books
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => !b.orderNo)
    .sort((x, y) => (x.b.acquiredOn || "").localeCompare(y.b.acquiredOn || ""));
  const assigned = new Map<number, number>();
  for (const { i } of missing) assigned.set(i, ++max);
  return books.map((b, i) => (assigned.has(i) ? { ...b, orderNo: assigned.get(i)! } : b));
}
