## Context

`useBookActions` (`hooks/use-books.ts`) aplica `update` e `remove` de forma otimista no cache `["books"]` do React Query. No `onMutate`, `snapshot()` guarda o array inteiro. No `onError`, `fail(ctx.prev)` grava esse array de volta com `setQueryData`. Outras escritas podem acontecer no cache enquanto a requisição está pendente:

- outro `update` ou `remove` otimista;
- o `onSuccess` de `create`, que põe o livro novo no início, e o `onSuccess` de `update`, que troca o livro pela versão do servidor;
- `patchLocal`, que a fila de capas (`use-auto-covers`) chama para aplicar `coverUrl` e `coverCheckedAt`;
- `replaceAll`, depois de importar ou sincronizar.

Quando a mutação falha, o snapshot apaga todas essas escritas. A query tem `staleTime` de 60s e não refaz a busca ao focar a janela, então nada corrige a tela.

## Goals / Non-Goals

**Goals:**
- Fazer o rollback de `update` e `remove` desfazer só o que a mutação que falhou mudou.
- Pôr essa lógica em funções puras e testáveis no ambiente `node` do Vitest, que hoje não tem jsdom nem Testing Library.
- Manter a assinatura de `useBookActions` e o comportamento de toast e do retorno `true`/`false`.

**Non-Goals:**
- O `onSuccess` de `update` grava o livro inteiro vindo do servidor e, com isso, pode sobrescrever outra mutação otimista ainda pendente no mesmo livro. Esse comportamento já existia e não faz parte do BP-04.
- Mutações de meta, que usam `createLatestSaver`, e o `create`, que não é otimista.
- Mudar `staleTime` ou `refetchOnWindowFocus`.

## Decisions

### 1. Rollback por campo do livro afetado, sem `invalidateQueries`

No `onMutate`, o hook calcula o patch que foi de fato aplicado, `applied`. É o patch enviado mais `borrower: null` quando o status sai de "emprestado". Ele também guarda os valores anteriores desses campos no livro, `prev`. No erro, para cada campo de `applied`, o valor de `prev` só volta se o campo ainda tiver o valor que a mutação gravou (`current[k] === applied[k]`). Todos os campos de `Book` são primitivos ou `null`, então `===` basta.

- **Alternativa: restaurar o livro inteiro a partir do snapshot daquele `id`.** Isso também apaga mudanças posteriores no mesmo livro, como uma capa aplicada por `patchLocal` ou outro campo editado. A versão por campo é igualmente simples e não tem esse problema.
- **Alternativa: `invalidateQueries` no `onSettled` ou no `onError`.** O refetch traz o estado do servidor e passa por cima do que ainda não chegou lá. Livros com `remove` pendente reaparecem até o DELETE terminar. Capas que estão no buffer de 2s da fila e ainda não foram gravadas somem, e a fila volta a buscá-las. Também haveria um request extra a cada falha. Fica descartado como mecanismo principal.

### 2. Rollback de `remove` reinsere só o livro excluído

No `onMutate`, o hook guarda o livro e a posição dele no array. No erro, se o `id` não estiver no cache, o livro volta na posição guardada, limitada ao tamanho atual do array. Se o `id` já estiver lá, por exemplo depois de um `replaceAll`, nada muda. A posição exata não é crítica, porque as telas ordenam a lista por conta própria. A posição limitada ao tamanho do array só evita um salto visual.

### 3. Funções puras em `lib/client/book-cache.ts`

- `optimisticFields(patch)`: devolve o patch efetivo, já com `borrower: null` quando cabe.
- `applyBookPatch(books, id, fields)`: devolve um novo array com o patch aplicado ao livro `id`.
- `pickFields(book, fields)`: devolve os valores anteriores das chaves de `fields`.
- `revertBookPatch(books, id, applied, prev)`: faz o rollback condicional por campo. Se o livro não estiver no cache, não faz nada.
- `restoreRemovedBook(books, book, index)`: reinsere o livro sem duplicar.

No hook, `onMutate` devolve `{ id, applied, prev }` ou `{ book, index }`. O `onError` usa as funções acima dentro de `setBooks` e mostra o toast pelo mesmo helper de hoje, que deixa de receber `prev`. `snapshot()` sai do hook. Se o livro não estava no cache no `onMutate`, o contexto fica vazio e o rollback é um no-op.

Os testes ficam em `lib/client/book-cache.test.ts`, que o `include` (`lib/**/*.test.ts`) já cobre, no mesmo padrão de `latest-saver.test.ts`.

### 4. Teste e2e do caso real

Em `tests/e2e/fixes.spec.ts` já existem testes que forçam falha com `page.route`. Um teste novo segura o PATCH do livro A, muda o status do livro B pela UI, libera o PATCH de A com erro 500 e verifica que B mantém o status novo e que A volta ao anterior.

## Risks / Trade-offs

- **Falha encadeada no mesmo campo.** A1 muda o status para "lido" e A2 muda para "lendo", com as duas pendentes. Se A1 falhar, o status continua "lendo", o que está certo. Se A2 também falhar, o status volta para "lido", que era o `prev` de A2 e não existe no servidor. → Caso raro: precisa de duas falhas seguidas no mesmo campo. O estado volta a bater com o servidor no próximo refetch. Fica documentado e não justifica fila de mutações por livro.
- **Comparação por `===` e um valor otimista igual ao anterior.** Se o patch não muda o valor, o rollback repõe o mesmo valor. → Não tem efeito visível.
- **Teste que passa sem provar nada.** → Durante a implementação, trocar temporariamente `revertBookPatch` por uma restauração do livro inteiro e confirmar que o teste "mudança mais recente no mesmo livro" falha. Depois, desfazer a troca.
