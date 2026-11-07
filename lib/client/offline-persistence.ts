import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createStore, del, get, set } from "idb-keyval";

const store = createStore("bodega-literaria", "offline-mutations");

export const OFFLINE_MUTATION_META = { persistOfflineMutation: true } as const;

/** Uma chave por pessoa: o que uma conta guardou não é lido pela outra. */
export function offlineStorageKey(userId: string) {
  return `bodega-offline-mutations:${userId}`;
}

/**
 * Escrita enfileirada que ainda não subiu.
 *
 * Um predicado só, usado nos dois lugares: para decidir o que vai para o
 * IndexedDB e para saber se sair da conta vai descartar alguma coisa. De
 * propósito — assim "o que seria perdido" é, por construção, "o que seria
 * gravado", em vez de dois critérios escritos separado que podem divergir na
 * primeira vez que alguém mexer num deles.
 *
 * Com `networkMode: "online"`, uma escrita sem rede fica `pending` e
 * `isPaused`; uma que está tentando agora fica `pending` sem pausa. As duas
 * contam: nenhuma das duas chegou ao servidor.
 */
export function isPendingOfflineMutation(mutation: {
  options: { meta?: Record<string, unknown> };
  state: { status: string };
}): boolean {
  return (
    mutation.options.meta?.persistOfflineMutation === true &&
    mutation.state.status === "pending"
  );
}

/**
 * Quantas vezes insistir numa mutação enfileirada que volta 401.
 *
 * Insistir faz sentido: a fila existe justamente para sobreviver a uma sessão
 * que caiu, e entrar de novo faz a escrita passar. Insistir **para sempre**
 * não: redefinir a senha revoga as sessões, então uma aba aberta ficava num
 * laço de rede até ser fechada, sem nunca contar o erro a quem estava olhando.
 * Com o atraso máximo de 30s, este teto desiste perto de dez minutos.
 */
export const OFFLINE_UNAUTHORIZED_MAX_RETRIES = 20;

export const offlineMutationRetry = (
  failureCount: number,
  error: Error
): boolean => {
  // Falha de rede: a fila espera a conexão voltar, sem teto — é a função dela.
  if (error instanceof TypeError) {
    return true;
  }
  const status = (error as Error & { status?: number }).status;
  if (status === 401) {
    return failureCount < OFFLINE_UNAUTHORIZED_MAX_RETRIES;
  }
  return (
    failureCount < 2 &&
    (status === 408 ||
      status === 429 ||
      (status !== undefined && status >= 500))
  );
};

/**
 * Apaga o que a pessoa deixou no navegador: a fila de escritas pendentes e o
 * acervo em cache.
 *
 * Sem isto, "Sair da conta" tirava a sessão mas deixava os livros no
 * IndexedDB, com `maxAge` infinito — em computador compartilhado, quem usasse
 * depois conseguia ler o acervo de quem saiu. Apaga só a chave de quem está
 * saindo: zerar a loja inteira jogaria fora escritas pendentes de outra conta
 * que ainda não sincronizaram.
 */
export async function clearOfflineData(
  userId: string,
  deps: { del: typeof del } = { del }
): Promise<void> {
  try {
    await deps.del(offlineStorageKey(userId), store);
  } catch {
    // Aba anônima ou armazenamento bloqueado: sair não pode falhar por isso.
  }
}

export const offlineMutationRetryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** Math.min(attempt, 5), 30_000) + Math.random() * 500;

export function createOfflinePersister(userId: string) {
  return createAsyncStoragePersister({
    key: offlineStorageKey(userId),
    storage: {
      getItem: async (key) => (await get<string>(key, store)) ?? null,
      setItem: (key, value) => set(key, value, store),
      removeItem: (key) => del(key, store),
    },
    throttleTime: 0,
  });
}
