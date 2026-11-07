/**
 * O `AppProvider` guarda três coisas em inicializadores de `useState`, que
 * rodam **uma vez só**: o QueryClient (com o acervo), o persister da fila
 * offline (cuja chave inclui o id da pessoa) e o objeto do usuário.
 *
 * Isso vale enquanto a instância do componente pertencer a uma identidade só.
 * O `key={user.id}` no layout é o que garante isso: sem ele, uma troca de
 * conta no mesmo navegador seguida de `router.refresh()` — que re-renderiza
 * sem desmontar — deixaria a aba mostrando o acervo de quem saiu, e gravaria
 * a fila offline de quem entrou sob a chave de quem saiu. Na volta, o
 * `resumePausedMutations()` replicaria a escrita com a sessão errada.
 *
 * Remontar é comportamento do React, e o projeto não tem harness de render de
 * componente; o caminho ainda depende de `router.refresh()` entre duas abas.
 * Então a guarda possível é ler a fonte. Ela não prova que o React remonta —
 * prova que a linha de que isso depende continua lá, que é o que se perde numa
 * refatoração distraída.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("identidade do AppProvider", () => {
  it("o layout remonta a árvore quando a conta muda", async () => {
    const source = await readFile(
      path.join(process.cwd(), "app/(app)/layout.tsx"),
      "utf8"
    );

    const abertura = source.indexOf("<AppProvider");
    const filhos = source.indexOf("<AppShell", abertura);
    expect(abertura).toBeGreaterThan(-1);
    expect(filhos).toBeGreaterThan(abertura);

    // Até os filhos, e não até o primeiro `>`: as props trazem arrow
    // functions, e a seta delas encerraria a fatia cedo demais.
    expect(source.slice(abertura, filhos)).toContain("key={user.id}");
  });

  it("a chave do armazenamento offline carrega o id da pessoa", async () => {
    const source = await readFile(
      path.join(process.cwd(), "lib/client/offline-persistence.ts"),
      "utf8"
    );

    // Se a chave deixar de depender do id, o `key` do layout vira inútil e
    // duas contas passam a dividir o mesmo armazenamento.
    expect(source).toMatch(/offlineStorageKey\s*\(\s*userId\s*:\s*string\s*\)/);
    expect(source).toMatch(/bodega-offline-mutations:\$\{userId\}/);
  });
});
