import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createStore, del, get, set } from "idb-keyval";

const store = createStore("bodega-literaria", "offline-mutations");

export const OFFLINE_MUTATION_META = { persistOfflineMutation: true } as const;

export const offlineMutationRetry = (
  _failureCount: number,
  error: Error
): boolean => {
  if (error instanceof TypeError) {
    return true;
  }
  const status = (error as Error & { status?: number }).status;
  return (
    status === 401 ||
    status === 408 ||
    status === 429 ||
    (status !== undefined && status >= 500)
  );
};

export const offlineMutationRetryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** Math.min(attempt, 5), 30_000) + Math.random() * 500;

export function createOfflinePersister(userId: string) {
  return createAsyncStoragePersister({
    key: `bodega-offline-mutations:${userId}`,
    storage: {
      getItem: async (key) => (await get<string>(key, store)) ?? null,
      setItem: (key, value) => set(key, value, store),
      removeItem: (key) => del(key, store),
    },
    throttleTime: 0,
  });
}
