## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-06` num worktree (`../book-manager-bp-06`) a partir de `fix/bp-04`, empilhada como a `fix/bp-05`. BP-03 e BP-04 ainda não estão na `main`, e o BP-05 segue sem commit no checkout principal.

## 1. Banco

- [x] 1.1 Em `lib/db/schema.ts`, adicionar `lentAt: timestamp("lent_at", { withTimezone: true })` à tabela `books`
- [x] 1.2 Rodar `pnpm db:generate` e acrescentar à migration gerada (`drizzle/0002_cultured_jigsaw.sql`), depois de um `--> statement-breakpoint`, o backfill `UPDATE "books" SET "lent_at" = "updated_at" WHERE "status" = 'emprestado';`
- [x] 1.3 Rodar `pnpm db:migrate` local e conferir a coluna e o backfill

## 2. Domínio

- [x] 2.1 Em `lib/domain/types.ts`, adicionar `lentAt: string | null` a `Book` (com JSDoc: ISO, controlado pelo servidor) e tirá-lo de `BookFields` (`Omit<…, "lentAt">`)
- [x] 2.2 Em `lib/domain/text.ts`, mudar `lentDurationLabel(d, now, tz)` para contar dias de calendário via `wallClock`, tratando string `YYYY-MM-DD` como dia já resolvido
- [x] 2.3 Testes de `lentDurationLabel` em `lib/domain/text.test.ts` (criar se não existir):
  - 22h de ontem em `America/Sao_Paulo` às 9h de hoje dá "há 1 dia", mas 23h59 e 00h01 do mesmo dia dão "hoje";
  - o mesmo instante em `Asia/Tokyo` e em `America/Sao_Paulo` dá contagens diferentes quando cai em dias diferentes;
  - as faixas 0, 1, 29, 30, 59 e 60 dias;
  - data futura dá "hoje", e entrada nula ou inválida dá `null`
- [x] 2.4 Atualizar os fixtures que montam `Book` à mão (`tests/support/reference.ts`, `lib/domain/weekly-sheets.test.ts`) e a coluna "Emprestado em" em `BOOK_SHEET_HEADERS` até o `pnpm typecheck` passar

## 3. Serviço

- [x] 3.1 Em `lib/services/books.ts`, `rowToBook` passa a devolver `lentAt` em ISO ou `null`
- [x] 3.2 Em `toValues` (updates), quando o patch traz `status`, usar `emprestado` → `CASE WHEN status = 'emprestado' THEN coalesce(lent_at, now()) ELSE now() END`, e qualquer outro status → `null`. Sem `status`, não mexer em `lentAt`
- [x] 3.3 Criar `toInsertValues(fields, lentAt?)` para `createBook`, `replaceBooks` e os inserts de `applyMerge`: `emprestado` → `lentAt` informado ou `new Date()`; outro status → `null`
- [x] 3.4 Fazer os updates de `applyMerge` também calcularem `lentAt` quando a planilha traz `status`, sem passar a limpar o `borrower`
- [x] 3.5 `replaceBooks` passa a aceitar `(BookFields & { lentAt?: string | null })[]`
- [x] 3.6 Testes de integração em `tests/integration/api.test.ts`:
  - `PATCH status=emprestado` grava `lentAt`;
  - favoritar, editar as anotações, gravar `coverCheckedAt`, trocar o `borrower` e reenviar `status=emprestado` mantêm o `lentAt`;
  - devolver limpa o `lentAt`, e emprestar de novo grava um valor novo;
  - `lentAt` enviado pelo cliente no `PATCH` e no `POST` é ignorado; um `PATCH` só com `lentAt` responde 400 "Nada para atualizar.";
  - criar um livro já `emprestado` grava `lentAt`;
  - o lote (`updateBooks`) e o merge da planilha (`applyMerge`, em updates e inserts) seguem as mesmas regras

## 4. Backup

- [x] 4.1 Em `lib/domain/backup.ts`, `toBackup` passa a incluir `lentAt` só em livros emprestados com valor
- [x] 4.2 O parse do import passa a ler `lentAt`: aceitar só ISO válido, não futuro e em livro `emprestado`; nos outros casos, `undefined`, para que `replaceBooks` use o instante da restauração ou `null`
- [x] 4.3 Testes em `lib/domain/backup.test.ts`: ida e volta preserva o `lentAt`; backup do standalone sem a chave; `lentAt` inválido ou futuro; `lentAt` em livro `lido` é descartado
- [x] 4.4 Integração de `POST /api/books/import`: um livro emprestado com `lentAt` de 20 dias atrás volta com o mesmo instante

## 5. UI

- [x] 5.1 Em `LentBadge`, ler `now` e `tz` de `useApp()` e chamar `lentDurationLabel(lentAt, new Date(app.now), app.tz)`
- [x] 5.2 Trocar `lentAt={b.updatedAt}` por `lentAt={b.lentAt}` em `book-card.tsx` e `book-row.tsx`
- [x] 5.3 Em `dashboard-page.tsx`, usar `b.lentAt` com `now` e `tz` do app na lista de emprestados
- [x] 5.4 `grep` para confirmar que nenhum outro uso de `updatedAt` aparece como data de empréstimo

## 6. Seed e E2E

- [x] 6.1 Em `scripts/seed-personas.ts`, passar `lentAt` com datas variadas (de 1 a 90 dias antes) nos 15 emprestados da Mariana, cumprindo "empréstimos com diferentes datas" da spec de personas
- [x] 6.2 E2E em `tests/e2e/fixes.spec.ts`: "Dom Casmurro" ganhou no fixture de referência um `lentAt` 5 dias antes de `FIXED_NOW`. O badge segue "Com Ana · há 5 dias" depois de favoritar, editar as anotações e recarregar, e o modal de emprestados do Painel mostra o mesmo. Livros emprestados durante o e2e sempre aparecem como "hoje", porque o `now()` do banco é real e o app usa `FIXED_NOW`, então a prova precisa de um `lentAt` semeado.
- [x] 6.3 Prova de detecção: trocar temporariamente `b.lentAt` por `b.updatedAt` no card, confirmar que o e2e falha e desfazer a troca

## 7. Verificação e registro

- [x] 7.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 7.2 Rodar o e2e de `fixes.spec.ts` e conferir se os snapshots visuais com livros emprestados mudaram Em `fix/bp-04`, sem esta change, `books.spec` ("Salvar fica inativo sem título…") e 9 snapshots visuais (`new-screens` e `oracle`: estante-lista e edicao) já falham com o mesmo diff. A change não muda nenhum snapshot.
- [x] 7.3 `openspec validate track-loan-start-date --strict`
- [x] 7.4 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/{book-catalog,reading-dashboard,shelf-browsing,data-portability}/spec.md`)
- [ ] 7.5 Depois do merge, conferir no log do deploy da Vercel o `Migrations aplicadas.` (o `vercel-build` roda `pnpm db:migrate` antes do `next build`) e o badge em produção
