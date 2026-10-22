import { describe, expect, it } from "vitest";

import { createBookWriteQueue } from "./book-write-queue";

/** Promessa controlável de fora. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise((r) => setTimeout(r));

describe("createBookWriteQueue", () => {
  it("envia as gravações do mesmo livro em ordem, uma de cada vez", async () => {
    const q = createBookWriteQueue();
    const sent: string[] = [];
    const d1 = deferred();
    const d2 = deferred();
    const first = q.run("a", { favorite: true }, () => {
      sent.push("1");
      return d1.promise;
    });
    const second = q.run("a", { favorite: false }, () => {
      sent.push("2");
      return d2.promise;
    });
    await tick();
    expect(sent).toEqual(["1"]);

    d1.resolve();
    await first;
    await tick();
    expect(sent).toEqual(["1", "2"]);

    d2.resolve();
    await second;
  });

  it("livros diferentes não esperam uns pelos outros", async () => {
    const q = createBookWriteQueue();
    const sent: string[] = [];
    const held = deferred();
    void q.run("a", { reading: "lido" }, () => {
      sent.push("a");
      return held.promise;
    });
    const b = q.run("b", { reading: "lendo" }, () => {
      sent.push("b");
      return Promise.resolve("ok");
    });
    await expect(b).resolves.toBe("ok");
    expect(sent).toEqual(["a", "b"]);
    held.resolve();
  });

  it("segue a fila depois de uma falha e entrega a falha a quem chamou", async () => {
    const q = createBookWriteQueue();
    const sent: string[] = [];
    const first = q.run("a", { favorite: true }, () => {
      sent.push("1");
      return Promise.reject(new Error("falhou"));
    });
    const second = q.run("a", { favorite: false }, () => {
      sent.push("2");
      return Promise.resolve("ok");
    });
    await expect(first).rejects.toThrow("falhou");
    await expect(second).resolves.toBe("ok");
    expect(sent).toEqual(["1", "2"]);
  });

  it("pendingFields junta os pendentes na ordem e já exclui a gravação que resolveu", async () => {
    const q = createBookWriteQueue();
    const d1 = deferred();
    const seenOnResolve: unknown[] = [];
    const first = q
      .run("a", { reading: "lido", yearRead: 2026 }, () => d1.promise)
      .then(() => seenOnResolve.push(q.pendingFields("a")));
    void q.run("a", { reading: "lendo" }, () => new Promise(() => undefined));
    void q.run("a", { favorite: true }, () => new Promise(() => undefined));

    expect(q.pendingFields("a")).toEqual({
      reading: "lendo",
      yearRead: 2026,
      favorite: true,
    });
    expect(q.pendingFields("b")).toEqual({});

    d1.resolve();
    await first;
    expect(seenOnResolve).toEqual([{ reading: "lendo", favorite: true }]);
  });

  it("a falha também tira o patch dos pendentes antes de rejeitar", async () => {
    const q = createBookWriteQueue();
    let seen: unknown;
    await q
      .run("a", { favorite: true }, () => Promise.reject(new Error("x")))
      .catch(() => {
        seen = q.pendingFields("a");
      });
    expect(seen).toEqual({});
  });

  it("esvazia quando todas as gravações terminam", async () => {
    const q = createBookWriteQueue();
    const a = q.run("a", { favorite: true }, () => Promise.resolve());
    const b = q.run("a", { favorite: false }, () =>
      Promise.reject(new Error("x"))
    );
    expect(q.busy()).toBe(true);
    await a;
    await b.catch(() => undefined);
    await tick();
    expect(q.busy()).toBe(false);
  });
});
