## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-14` a partir da `main` atualizada, depois do merge do BP-07 e do PR #17

## 1. Merge

- [x] 1.1 Em `mergeSheet`, limpar `x.borrower` quando o status final do livro casado não for "emprestado"
- [x] 1.2 Em `mergeSheet`, usar o `borrower` de `legacyToFields` nas inserções, sem sobrescrever
- [x] 1.3 Em `applyMerge`, gravar as atualizações com `toUpdateValues(u.fields)`

## 2. Testes

- [x] 2.1 Em `lib/domain/sheet.test.ts`: livro que sai de emprestado perde quem pegou; nome na planilha não é gravado em livro não emprestado; nome fantasma antigo é limpo; livro emprestado mantém e atualiza quem pegou; inserção só guarda quem pegou nos emprestados
- [x] 2.2 Em `tests/integration/api.test.ts`: `applyMerge` com `{ status: "lido" }` num livro emprestado limpa `borrower` e `lentAt`
- [x] 2.3 Prova de detecção: com `sheet.ts` e `books.ts` da `main`, os 5 testes do bug falham, e o de controle (emprestado mantém e atualiza) passa

## 3. Verificação e registro

- [x] 3.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 3.2 Pôr a quebra de linha final no `.mcp.json`, que quebrava o `pnpm lint` na `main`
- [x] 3.3 `openspec validate clear-borrower-on-sheet-merge --strict`
- [ ] 3.4 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/spreadsheet-sync/spec.md`), merge na `main` e `main` local atualizada
