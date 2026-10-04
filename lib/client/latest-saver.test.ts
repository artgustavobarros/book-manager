import { describe, expect, it, vi } from "vitest";

import { createLatestSaver } from "./latest-saver";

/** Promessa controlável de fora. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createLatestSaver", () => {
  it("envia em ordem, um de cada vez", async () => {
    const sent: number[] = [];
    const pending: ReturnType<typeof deferred>[] = [];
    const save = createLatestSaver(
      (v: number) => {
        sent.push(v);
        const d = deferred();
        pending.push(d);
        return d.promise;
      },
      { initial: 24, onFail: vi.fn() }
    );
    save(25);
    save(26);
    const last = save(27);
    await Promise.resolve();
    expect(sent).toEqual([25]);
    for (let i = 0; i < 3; i++) {
      pending[i].resolve();
      await new Promise((r) => setTimeout(r));
    }
    await last;
    expect(sent).toEqual([25, 26, 27]);
  });

  it("só reporta a falha da gravação mais recente, com o último valor salvo", async () => {
    const onFail = vi.fn();
    const save = createLatestSaver(
      (v: number) =>
        v === 26 ? Promise.resolve() : Promise.reject(new Error("falhou " + v)),
      {
        initial: 24,
        onFail,
      }
    );
    save(25);
    save(26);
    await save(27);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith(
      26,
      expect.objectContaining({ message: "falhou 27" })
    );
  });

  it("não reporta falha superada por uma gravação que deu certo", async () => {
    const onFail = vi.fn();
    const save = createLatestSaver(
      (v: number) =>
        v === 25 ? Promise.reject(new Error("x")) : Promise.resolve(),
      {
        initial: 24,
        onFail,
      }
    );
    save(25);
    await save(26);
    expect(onFail).not.toHaveBeenCalled();
  });
});
