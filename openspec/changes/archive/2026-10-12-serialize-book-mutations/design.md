## Context

`useBookActions` (`hooks/use-books.ts`) aplica cada `update` de forma otimista no cache `["books"]`. Depois do BP-04, o `onError` desfaz só os campos da mutação que falhou e que ainda têm o valor otimista. O `onSuccess`, porém, ainda troca o livro inteiro pelo que o servidor devolveu:

```ts
onSuccess: ({ book }) =>
  setBooks((bs) => bs.map((b) => (b.id === book.id ? book : b))),
```

Com duas edições no mesmo livro antes da primeira resposta:

1. A edição 1 aplica `favorite: true` e manda o PATCH 1. A edição 2 aplica `favorite: false` e manda o PATCH 2, em paralelo.
2. A resposta 1 chega com `favorite: true` e passa por cima do valor otimista da edição 2. A tela volta a mostrar o favorito.
3. A resposta 2 corrige a tela, mas só se for a última a chegar. Como os PATCHs saem em paralelo, o servidor pode processá-los em qualquer ordem. O banco pode terminar com `true`, e a tela com o valor da última resposta recebida.

As ações rápidas de `app-provider.tsx` (`toggleFavorite`, `cycleStatus`, `startReading`, `finish`...) montam o patch a partir do livro que está na tela. Por isso, duas ações seguidas fazem sentido para o usuário, e a ordem em que chegam ao servidor importa. A meta já resolve o mesmo problema com `createLatestSaver` (`lib/client/latest-saver.ts`), que manda as gravações em fila.

O `useBookActions` é chamado em vários componentes (`app-provider`, `book-modals`, `insights-page`...). Cada chamada cria o seu próprio `useMutation`. Uma edição pela ficha e outra pela ação rápida, no mesmo livro, passam por instâncias diferentes do hook.

## Goals / Non-Goals

**Goals:**
- Garantir que o servidor recebe as edições de um mesmo livro na ordem em que foram feitas.
- Impedir que a resposta de uma edição desfaça na tela outra edição pendente no mesmo livro.
- Continuar aplicando os campos que o servidor devolve, como `updatedAt`, quando nenhuma edição pendente os mudou.
- Manter a assinatura de `useBookActions`, o toast de erro, o retorno `true`/`false` e o rollback do BP-04.
- Pôr a lógica em módulos testáveis no ambiente `node` do Vitest.

**Non-Goals:**
- Pôr `remove` e `create` na mesma fila. Um `remove` com `update` pendente no mesmo livro continua como hoje: o PATCH pode responder 404 e o rollback é um no-op, porque o livro já saiu do cache.
- O lote de capas de `use-auto-covers` (`PATCH /api/books` em lote), que não passa por `update`.
- `refetch` e `replaceAll` durante uma edição pendente, que já sobrescreviam o cache antes desta mudança.
- Concorrência entre abas ou dispositivos.
- Mudar `staleTime`, `refetchOnWindowFocus` ou a API.

## Decisions

### 1. Fila por livro, no estilo de `createLatestSaver`, e sobreposição dos campos pendentes

O BP-05 sugere duas correções: serializar ou ignorar a resposta enquanto houver edição pendente. Esta change usa as duas, porque cada uma resolve uma metade do problema:

- **Só a fila** garante a ordem no servidor. A resposta 1, porém, ainda chega antes de a edição 2 terminar e volta a tela ao estado da edição 1 por um instante.
- **Só ignorar a resposta** acaba com a volta na tela, mas os PATCHs continuam em paralelo e o banco pode terminar diferente da tela.

Com a fila, as edições pendentes de um livro são sempre posteriores à que acabou de responder. Por isso, sobrepor os campos delas ao livro do servidor dá o estado certo.

- **Alternativa: ignorar a resposta enquanto houver edição pendente, em vez de sobrepor.** Perde os campos que só o servidor calcula até a última edição responder. Se a última falhar, esses campos não chegam nunca. Sobrepor custa o mesmo e não tem esse problema.
- **Alternativa: `scope` das mutações do TanStack Query.** O `scope.id` é fixo por `useMutation` e não varia por chamada, então serializaria todos os livros juntos. Também não ajudaria a sobrepor campos.
- **Alternativa: consultar o `MutationCache` para achar mutações pendentes do mesmo `id`.** Depende de detalhes internos, como a ordem do cache, o estado `pending` durante o `onSuccess` e o formato do `context`. Isso é frágil e difícil de testar em `node`.

### 2. Módulo `lib/client/book-write-queue.ts`

`createBookWriteQueue()` devolve:

- `run(id, applied, send)`: registra `applied` como pendente para `id`, encadeia `send` depois da última gravação desse `id` e devolve o resultado de `send`. Se uma gravação anterior falhou, a fila segue mesmo assim. O registro pendente sai antes de a promessa resolver ou rejeitar, então o `onSuccess` e o `onError` da própria mutação já não o veem. Quando a cadeia de um `id` esvazia, a entrada sai do `Map`.
- `pendingFields(id)`: devolve a junção, na ordem de chegada, dos patches ainda pendentes de `id`, ou `{}` se não houver nenhum.

Em `hooks/use-books.ts`, uma instância fica no escopo do módulo, como `coverQueue` em `use-auto-covers.ts`, e é compartilhada por todas as chamadas de `useBookActions`. O `mutationFn` de `update` passa a ser:

```ts
mutationFn: ({ id, patch }) =>
  bookWrites.run(id, optimisticFields(patch), () =>
    api.patch<{ book: Book }>(`/api/books/${id}`, patch)),
```

O registro acontece no `mutationFn`, que o TanStack Query chama logo depois do `onMutate`, ainda na mesma sequência de microtarefas do clique. Assim, nenhuma resposta de rede chega antes de a edição estar registrada. `optimisticFields` é puro, então recalcular o patch efetivo no `mutationFn` dá o mesmo valor que o `onMutate` aplicou.

### 3. `settleBook` em `lib/client/book-cache.ts`

`settleBook(books, serverBook, pending)` troca o livro de mesmo `id` por `{ ...serverBook, ...pending }`. Se o livro não estiver no cache, por exemplo porque foi excluído nesse meio-tempo, nada muda, como já acontece hoje. O `onSuccess` passa a ser:

```ts
onSuccess: ({ book }) =>
  setBooks((bs) => settleBook(bs, book, bookWrites.pendingFields(book.id))),
```

O `onError` continua com `revertBookPatch` do BP-04. Ele desfaz só os campos que ainda têm o valor otimista da edição que falhou. Uma edição posterior que mudou o mesmo campo fica como está.

### 4. Testes

- `lib/client/book-write-queue.test.ts`: mesmo `id` em série, `id`s diferentes em paralelo, fila que segue depois de uma falha, `pendingFields` na ordem e sem a gravação já terminada durante o resolve, e `Map` vazio no fim. Usa promessas controladas, como em `latest-saver.test.ts`.
- `lib/client/book-cache.test.ts`: `settleBook` com e sem campos pendentes, campo do servidor que não está pendente passa a valer, e livro ausente sem mudança.
- `tests/e2e/fixes.spec.ts`: segurar o PATCH 1 do favorito do livro A com `page.route` e clicar de novo. Verificar que o PATCH 2 ainda não saiu e liberar o 1. Verificar que A continua sem favorito com o PATCH 2 segurado, liberar o 2 e recarregar para conferir o banco.

## Risks / Trade-offs

- **Uma edição espera a anterior no mesmo livro.** → A segunda resposta demora um pouco mais. A tela já mostra o valor otimista na hora, então a espera só aparece no toast de sucesso. Livros diferentes não esperam.
- **Um PATCH que trava segura a fila daquele livro.** → O `fetch` do `api` não tem timeout próprio, então as próximas edições desse livro ficam pendentes até o navegador desistir da requisição. A tela continua otimista e os outros livros não são afetados. Fica registrado e não justifica um timeout nesta change.
- **Estado no escopo do módulo.** → É compartilhado por todos os `QueryClient`. O app só tem um, e os testes criam a própria instância com `createBookWriteQueue()`.
- **Teste que passa sem provar nada.** → Durante a implementação, voltar temporariamente o `mutationFn` para o PATCH direto e o `onSuccess` para a troca do livro inteiro, confirmar que os testes de ordem e de sobreposição falham e desfazer a troca.
