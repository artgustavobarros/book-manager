## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-04` a partir da `main` atualizada

## 1. Funções puras de cache

- [x] 1.1 Criar `lib/client/book-cache.ts` com `optimisticFields`, `applyBookPatch`, `pickFields`, `revertBookPatch` e `restoreRemovedBook`
- [x] 1.2 Criar `lib/client/book-cache.test.ts` cobrindo estes casos:
  - falha em A preserva B editado, B criado e B excluído;
  - falha em A preserva a capa aplicada por `patchLocal` em B e em A;
  - falha em A desfaz só os campos do patch e mantém um campo de A mudado depois;
  - campo do patch mudado depois no mesmo livro não é revertido;
  - `borrower` limpo pelo patch de status volta ao valor anterior;
  - livro ausente do cache: rollback é no-op;
  - `remove` que falha reinsere o livro, sem duplicar e com a posição limitada ao tamanho do array
- [x] 1.3 Prova de detecção: trocar temporariamente `revertBookPatch` por uma restauração do livro inteiro, confirmar que o teste do campo mudado depois falha e desfazer a troca

## 2. Hook

- [x] 2.1 Em `hooks/use-books.ts`, fazer `update.onMutate` usar `optimisticFields`/`pickFields`/`applyBookPatch` e devolver `{ id, applied, prev }`, e fazer `onError` chamar `revertBookPatch`
- [x] 2.2 Fazer `remove.onMutate` devolver `{ book, index }` e `remove.onError` chamar `restoreRemovedBook`
- [x] 2.3 Remover `snapshot()` e o `prev` de `fail`, mantendo o toast de erro e o retorno `true`/`false`. `patchLocal` passa a usar `applyBookPatch`

## 3. E2E

- [x] 3.1 Em `tests/e2e/fixes.spec.ts`, segurar o PATCH do livro A com `page.route`, mudar o status do livro B pela UI, liberar A com 500 e verificar que B mantém o status novo e que A volta ao anterior

## 4. Verificação e registro

- [x] 4.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 4.2 Rodar o e2e de `fixes.spec.ts`
- [x] 4.3 `openspec validate scope-optimistic-rollback --strict`
- [ ] 4.4 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/app-shell/spec.md`)
