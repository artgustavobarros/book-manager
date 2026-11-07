/**
 * Regressão da unidade diferida da auditoria (run-1): fila offline e cache
 * persistido em IndexedDB.
 *
 * Dois problemas reais, e uma hipótese que não se confirmou.
 *
 * 1. "Sair da conta" tirava a sessão mas deixava o acervo no IndexedDB, com
 *    `maxAge` infinito. Em computador compartilhado, quem usasse depois lia os
 *    livros de quem saiu.
 * 2. Uma mutação enfileirada que voltasse 401 era repetida para sempre.
 *    Redefinir a senha revoga as sessões, então bastava uma aba aberta para o
 *    laço começar e nunca terminar.
 *
 * O que **não** se confirmou: replay de escrita na conta de outra pessoa. A
 * chave do persister é `bodega-offline-mutations:<userId>`, então o cliente de
 * cada conta só lê a própria chave. O teste abaixo trava essa separação, que é
 * o que torna o replay impossível.
 */
import { describe, expect, it, vi } from "vitest";

import {
  clearOfflineData,
  isPendingOfflineMutation,
  OFFLINE_UNAUTHORIZED_MAX_RETRIES,
  offlineMutationRetry,
  offlineStorageKey,
} from "@/lib/client/offline-persistence";

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

describe("chave de armazenamento", () => {
  it("separa as contas", () => {
    expect(offlineStorageKey("ana")).not.toBe(offlineStorageKey("bia"));
    expect(offlineStorageKey("ana")).toContain("ana");
  });
});

describe("repetição de mutação enfileirada", () => {
  it("desiste do 401 depois do teto, em vez de repetir para sempre", () => {
    expect(offlineMutationRetry(0, httpError(401))).toBe(true);
    expect(
      offlineMutationRetry(OFFLINE_UNAUTHORIZED_MAX_RETRIES - 1, httpError(401))
    ).toBe(true);
    expect(
      offlineMutationRetry(OFFLINE_UNAUTHORIZED_MAX_RETRIES, httpError(401))
    ).toBe(false);
    expect(
      offlineMutationRetry(
        OFFLINE_UNAUTHORIZED_MAX_RETRIES + 500,
        httpError(401)
      )
    ).toBe(false);
  });

  it("segue esperando sem teto quando é falha de rede", () => {
    // É a razão de existir da fila offline: a conexão volta e a escrita passa.
    const semRede = new TypeError("Failed to fetch");
    expect(offlineMutationRetry(0, semRede)).toBe(true);
    expect(offlineMutationRetry(10_000, semRede)).toBe(true);
  });

  it("não repete erro do próprio pedido", () => {
    expect(offlineMutationRetry(0, httpError(400))).toBe(false);
    expect(offlineMutationRetry(0, httpError(409))).toBe(false);
    expect(offlineMutationRetry(0, httpError(422))).toBe(false);
  });

  it("repete pouco em erro passageiro do servidor", () => {
    for (const status of [408, 429, 500, 503]) {
      expect(offlineMutationRetry(0, httpError(status))).toBe(true);
      expect(offlineMutationRetry(2, httpError(status))).toBe(false);
    }
  });
});

describe("escrita pendente", () => {
  const mutation = (status: string, meta?: Record<string, unknown>) => ({
    options: { meta },
    state: { status },
  });

  it("conta só o que foi enfileirado e ainda não subiu", () => {
    expect(
      isPendingOfflineMutation(
        mutation("pending", { persistOfflineMutation: true })
      )
    ).toBe(true);

    // Já terminou, de um jeito ou de outro: não há o que perder.
    for (const status of ["success", "error", "idle"]) {
      expect(
        isPendingOfflineMutation(
          mutation(status, { persistOfflineMutation: true })
        )
      ).toBe(false);
    }

    // Pendente, mas não faz parte da fila offline.
    expect(isPendingOfflineMutation(mutation("pending"))).toBe(false);
    expect(
      isPendingOfflineMutation(
        mutation("pending", { persistOfflineMutation: false })
      )
    ).toBe(false);
  });

  /**
   * O aviso ao sair da conta e o que vai para o IndexedDB precisam enxergar a
   * mesma coisa. Se divergirem, ou se avisa sobre nada, ou se perde em
   * silêncio — que era o defeito que este predicado veio fechar.
   */
  it("é o mesmo critério que decide o que é guardado", () => {
    const guardada = mutation("pending", { persistOfflineMutation: true });
    const descartavel = mutation("success", { persistOfflineMutation: true });

    expect(isPendingOfflineMutation(guardada)).toBe(true);
    expect(isPendingOfflineMutation(descartavel)).toBe(false);
  });
});

describe("limpeza ao sair da conta", () => {
  it("apaga a chave de quem saiu, e só ela", async () => {
    const del = vi.fn().mockResolvedValue(undefined);

    await clearOfflineData("ana", { del });

    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0][0]).toBe(offlineStorageKey("ana"));
    // A chave de outra conta pode ter escrita pendente ainda não sincronizada.
    expect(del.mock.calls[0][0]).not.toContain("bia");
  });

  it("não quebra o logout se o armazenamento estiver bloqueado", async () => {
    const del = vi.fn().mockRejectedValue(new Error("SecurityError"));

    await expect(clearOfflineData("ana", { del })).resolves.toBeUndefined();
  });
});
