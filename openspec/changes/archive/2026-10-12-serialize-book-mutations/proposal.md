## Why

Quando o usuário faz duas edições seguidas no mesmo livro, como favoritar duas vezes ou mudar o status e logo depois clicar em "Começar a ler", o `onSuccess` da primeira grava no cache o livro que o servidor devolveu e passa por cima da segunda edição, que ainda está pendente (BP-05 do `BUGPOOL_REPORT.md`). A tela volta ao estado da edição 1 até a resposta 2 chegar. Os dois PATCHs também saem em paralelo. Se o servidor processar os dois fora de ordem, o banco fica com a edição 1 e a tela com a 2, e nada corrige isso antes do próximo refetch.

## What Changes

- Os `update` de um mesmo livro passam a ser enviados em fila: cada PATCH espera o anterior do mesmo `id` terminar, com sucesso ou com erro. Assim, o último a chegar ao servidor é o último pedido. Livros diferentes continuam em paralelo.
- Quando um `update` termina com sucesso, o livro do servidor entra no cache com os campos das edições ainda pendentes nesse livro aplicados por cima. Campos calculados pelo servidor passam a valer, e o valor otimista das edições pendentes continua na tela.
- Um módulo em `lib/client/` cuida da fila por livro e dos patches pendentes. Uma função pura em `lib/client/book-cache.ts` aplica a resposta do servidor ao cache. Testes unitários cobrem a ordem e a sobreposição.
- Um requisito novo na spec de `app-shell` cobre edições seguidas no mesmo livro.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `app-shell`: novo requisito "Edições seguidas no mesmo livro". A resposta de uma edição não pode desfazer na tela outra edição ainda pendente, e o servidor recebe as edições na ordem em que foram feitas.

## Impact

- `hooks/use-books.ts`: `useBookActions`, no `mutationFn` e no `onSuccess` de `update`.
- Novo `lib/client/book-write-queue.ts` e `lib/client/book-write-queue.test.ts`. Nova função em `lib/client/book-cache.ts`, com testes em `book-cache.test.ts`.
- Novo teste e2e em `tests/e2e/fixes.spec.ts`.
- Não muda API, rota, banco nem a assinatura de `useBookActions`. Depende do rollback por campo do BP-04 (`scope-optimistic-rollback`).
