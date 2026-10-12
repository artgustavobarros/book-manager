## Why

O rótulo "Com Fulano · há N dias" da Estante e do Painel é calculado a partir de `updatedAt` (BP-06 do `BUGPOOL_REPORT.md`). Como `updatedAt` usa `$onUpdate(() => new Date())`, qualquer edição do livro emprestado volta a contagem para "hoje": favoritar, mudar as anotações ou a busca automática de capa gravar `coverCheckedAt`. Além disso, `lentDurationLabel` faz `floor(ms / 86400000)`, que conta blocos de 24 h e não dias de calendário. Um livro emprestado às 22h de ontem aparece como "hoje" às 9h, e o dia muda na virada do UTC, não na meia-noite do usuário.

## What Changes

- Nova coluna `lent_at` (`timestamptz`, opcional) na tabela `books`, criada por migration do Drizzle. A migration preenche `lent_at = updated_at` nos livros que já estão emprestados, que é a melhor aproximação disponível.
- O servidor passa a ser o dono de `lentAt`: grava o instante atual quando o livro **entra** em `emprestado` (criação, edição, edição em lote e merge da planilha), mantém o valor quando o livro continua emprestado e limpa o campo quando ele sai do status. Outras edições não mexem nele.
- `Book` ganha `lentAt: string | null`, que é só leitura. O campo fica fora de `BookFields` e a API não aceita esse valor do cliente.
- `lentDurationLabel` passa a contar a diferença em dias de calendário no fuso do usuário. O fuso vem do cookie `bodega-tz`, que já existe, e do `now` do `AppProvider`, e o cálculo usa `wallClock`. Assim servidor e cliente chegam ao mesmo rótulo e não há divergência de hidratação.
- `LentBadge` (card e linha da Estante) e a lista de emprestados do Painel passam a usar `b.lentAt` em vez de `b.updatedAt`.
- O backup JSON passa a levar `lentAt` nos livros emprestados. A restauração usa esse valor quando ele é válido. Se ele faltar ou for inválido, como num backup antigo ou do standalone, a restauração usa o instante dela.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `book-catalog`: o modelo de dados passa a ter a data de início do empréstimo, e o fluxo de empréstimo e devolução define quando ela é gravada, mantida e limpa.
- `reading-dashboard`: o detalhamento de empréstimos conta os dias de calendário no fuso do usuário a partir do início do empréstimo, não da última edição.
- `shelf-browsing`: a badge de empréstimo da Estante mostra o tempo desde o início do empréstimo, com a mesma regra de dias de calendário.
- `data-portability`: o backup JSON salva e restaura a data de início dos empréstimos.

## Impact

- Banco: `lib/db/schema.ts` e uma migration nova em `drizzle/` (`ALTER TABLE` mais o backfill). O deploy da Vercel aplica a migration sozinho (`vercel-build` roda `pnpm db:migrate`).
- Serviço: `lib/services/books.ts` (`rowToBook`, `toValues`, `createBook`, `updateBook`, `updateBooks`, `replaceBooks`, `applyMerge`).
- Domínio: `lib/domain/types.ts` (`Book`, `BookFields`), `lib/domain/text.ts` (`lentDurationLabel`), `lib/domain/backup.ts` (`toBackup`, `legacyToFields` e o parse do import) e `lib/domain/weekly-sheets.ts`. A cópia semanal exporta todos os campos de `Book`, então ganha a coluna "Emprestado em".
- UI: `components/books/lent-badge.tsx`, `book-card.tsx`, `book-row.tsx` e `components/painel/dashboard-page.tsx`.
- Testes e fixtures que montam `Book` à mão precisam do campo novo (`tests/support/reference.ts`, testes de `lib/domain` e `lib/client`).
- A API de livros não muda de forma: `GET` e `PATCH` passam a devolver `lentAt`, e um `lentAt` enviado pelo cliente é ignorado.
