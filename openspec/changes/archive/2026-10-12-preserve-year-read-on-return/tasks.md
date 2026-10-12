## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-07` a partir da `main` atualizada, depois do merge do BP-05

## 1. Regras de domínio

- [x] 1.1 Adicionar `isRead(book)` e `returnStatus(book)` em `lib/domain/status.ts`
- [x] 1.2 Cobrir as duas em `lib/domain/status.test.ts`: lido, emprestado com e sem ano, doado com ano; devolução com e sem ano
- [x] 1.3 Trocar o filtro de lidos de `dashboard()` e `insights()` por `isRead`
- [x] 1.4 Em `dashboard.test.ts`, conferir que um emprestado com ano conta na meta, em "Lidos no ano" e no KPI Lidos, e que um emprestado sem ano não conta
- [x] 1.5 Em `insights.test.ts`, conferir que um emprestado com ano entra em "Lidos por ano", nas páginas lidas e na lista de atribuir ano

## 2. Ações

- [x] 2.1 Em `components/app/app-provider.tsx`, fazer `returnBook(book)` gravar só `{ status: returnStatus(book), borrower: null }` e tirar o parâmetro `returnStatus` da assinatura
- [x] 2.2 Fazer `undoRead` num livro `emprestado` gravar só `yearRead: null`

## 3. E2E

- [x] 3.1 Em `tests/e2e/fixes.spec.ts`: Macunaíma (`lido`, 2026) continua na meta e em "Lidos no ano" emprestado a Rita, e depois de devolvido pelo ✕ do badge volta a `lido`, com o mesmo contador da meta
- [x] 3.2 Prova de detecção: com o `returnBook` antigo, o e2e falha (status `nao-lido` depois de recarregar); com o filtro antigo, os testes unitários de `isRead`, `dashboard` e `insights` falham

## 4. Verificação e registro

- [x] 4.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 4.2 Rodar o e2e de `fixes.spec.ts` e o de emprestar e devolver do `books.spec.ts`
- [x] 4.3 `openspec validate preserve-year-read-on-return --strict`
- [ ] 4.4 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e das specs `book-catalog`, `reading-dashboard` e `collection-insights`), merge na `main` e `main` local atualizada
