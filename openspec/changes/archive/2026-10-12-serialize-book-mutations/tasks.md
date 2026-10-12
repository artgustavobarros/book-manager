## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-05` a partir da `main` atualizada, depois do merge do BP-04. Se o BP-04 ainda não estiver na `main`, partir de `fix/bp-04` e abrir o PR em cima dele

## 1. Fila por livro

- [x] 1.1 Criar `lib/client/book-write-queue.ts` com `createBookWriteQueue()` (`run(id, applied, send)` e `pendingFields(id)`)
- [x] 1.2 Criar `lib/client/book-write-queue.test.ts` cobrindo:
  - duas gravações do mesmo `id`: a segunda só começa depois que a primeira termina;
  - `id`s diferentes rodam em paralelo;
  - a fila segue depois de uma gravação que falhou, e a falha chega a quem chamou;
  - `pendingFields` junta os patches pendentes na ordem e já não inclui a gravação que está resolvendo;
  - a entrada do `id` sai do `Map` quando a fila esvazia

## 2. Resposta do servidor no cache

- [x] 2.1 Adicionar `settleBook(books, serverBook, pending)` em `lib/client/book-cache.ts`
- [x] 2.2 Em `lib/client/book-cache.test.ts`, cobrir `settleBook`: sem pendentes troca o livro inteiro, campos pendentes ficam por cima, campo do servidor fora dos pendentes passa a valer, livro ausente não muda nada

## 3. Hook

- [x] 3.1 Em `hooks/use-books.ts`, criar a instância `bookWrites` no escopo do módulo e fazer o `mutationFn` de `update` passar por `bookWrites.run(id, optimisticFields(patch), ...)`
- [x] 3.2 Trocar o `onSuccess` de `update` por `settleBook(bs, book, bookWrites.pendingFields(book.id))` e atualizar o comentário de `useBookActions`
- [x] 3.3 Prova de detecção: voltar temporariamente o `mutationFn` para o PATCH direto e o `onSuccess` para a troca do livro inteiro, confirmar que os testes de ordem e sobreposição falham e desfazer a troca

## 4. E2E

- [x] 4.1 Em `tests/e2e/fixes.spec.ts`, segurar o PATCH 1 do favorito do livro A, clicar de novo e conferir que o PATCH 2 ainda não saiu. Liberar o 1 e conferir que A continua sem favorito com o 2 segurado. Liberar o 2, recarregar e conferir que A continua sem favorito
- [x] 4.2 No mesmo arquivo, conferir que, com o PATCH de A segurado, o PATCH de B sai na hora (já coberto pelo teste do BP-04, que espera o PATCH de B com A segurado; ficou um comentário nele)

## 5. Verificação e registro

- [x] 5.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 5.2 Rodar o e2e de `fixes.spec.ts`
- [x] 5.3 `openspec validate serialize-book-mutations --strict`
- [ ] 5.4 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/app-shell/spec.md`), merge na `main` e `main` local atualizada
