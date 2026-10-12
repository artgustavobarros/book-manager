import type { BookFields } from "@/lib/domain/types";

type Patch = Partial<BookFields>;

/**
 * Gravações de livros em fila por `id`: cada PATCH espera o anterior do mesmo livro
 * (com sucesso ou erro), então o último a chegar ao servidor é o último pedido. Livros
 * diferentes seguem em paralelo. Guarda os patches ainda pendentes de cada livro para
 * que a resposta de uma gravação não apague na tela as que vêm depois dela.
 */
export function createBookWriteQueue() {
  const tails = new Map<string, Promise<unknown>>();
  const pending = new Map<string, { fields: Patch }[]>();

  const settle = (id: string, entry: { fields: Patch }) => {
    const rest = (pending.get(id) ?? []).filter((e) => e !== entry);
    if (rest.length) {
      pending.set(id, rest);
    } else {
      pending.delete(id);
    }
  };

  return {
    /**
     * Enfileira `send` depois da última gravação de `id`. `applied` conta como pendente
     * até `send` terminar e sai antes de a promessa devolvida resolver ou rejeitar.
     */
    run<T>(id: string, applied: Patch, send: () => Promise<T>): Promise<T> {
      const entry = { fields: applied };
      pending.set(id, [...(pending.get(id) ?? []), entry]);

      const run = (tails.get(id) ?? Promise.resolve()).then(() =>
        send().finally(() => settle(id, entry))
      );
      const tail = run.then(
        () => undefined,
        () => undefined
      );
      tails.set(id, tail);
      void tail.then(() => {
        if (tails.get(id) === tail) {
          tails.delete(id);
        }
      });
      return run;
    },

    /** Junção, na ordem de chegada, dos patches ainda pendentes de `id`. */
    pendingFields(id: string): Patch {
      return Object.assign({}, ...(pending.get(id) ?? []).map((e) => e.fields));
    },

    /** Se ainda há alguma gravação na fila (para testes). */
    busy: () => tails.size > 0 || pending.size > 0,
  };
}
