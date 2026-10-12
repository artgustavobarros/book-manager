## Context

Hoje o início de um empréstimo não fica registrado em lugar nenhum. A Estante (`LentBadge` em `book-card.tsx` e `book-row.tsx`) e a lista de emprestados do Painel (`dashboard-page.tsx`) passam `b.updatedAt` para `lentDurationLabel`, e `updatedAt` muda em qualquer `UPDATE` por causa do `$onUpdate(() => new Date())` do Drizzle. A busca automática de capa (`use-auto-covers`) grava `coverCheckedAt` sozinha, então um livro emprestado pode voltar para "hoje" sem nenhuma ação do usuário.

`lentDurationLabel(d, now)` faz `Math.floor((now - d) / 86400000)`, que conta blocos de 24 h no relógio absoluto e não dias de calendário. O app já tem o que é preciso para trabalhar com o fuso do usuário: o cookie `bodega-tz`, gravado por script no `app/layout.tsx`; o `tz` e o `now` que o `app/(app)/layout.tsx` calcula, este último fixável por `FIXED_NOW` nos testes; ambos chegando ao cliente pelo `AppProvider` (`app.tz` e `app.now`); e `wallClock(now, tz)` em `lib/domain/clock.ts`. Os componentes do badge são client components, mas também são renderizados no servidor. Calcular com `new Date()` e o fuso do processo dá rótulos diferentes no SSR (UTC na Vercel) e no navegador.

Escritas que podem mudar o status de um livro: `createBook`, `updateBook`, `updateBooks` (lote), `replaceBooks` (restaurar backup e seed de personas) e `applyMerge` (merge da planilha, em updates e inserts). Todas passam por `toValues` em `lib/services/books.ts`, exceto os inserts de `applyMerge`.

## Goals / Non-Goals

**Goals:**

- Ter uma data de início do empréstimo que só muda quando o livro entra em `emprestado` ou sai dele.
- Fazer o rótulo contar dias de calendário no fuso do usuário e sair igual no SSR e no cliente.
- Dar aos livros que já estão emprestados um valor inicial plausível, sem deixar a contagem vazia.
- Fazer o backup preservar a data, para que uma ida e volta não reintroduza o bug.

**Non-Goals:**

- Campo de data no modal "Emprestado para quem?" para registrar um empréstimo retroativo. O requisito do catálogo já cita "opcionalmente a data do empréstimo", mas isso é feature nova e fica para outra change. A coluna nova é o que viabiliza essa feature depois.
- Histórico de empréstimos (vários períodos por livro).
- Levar a data do empréstimo para o CSV ou para o merge da planilha. Nenhum dos dois ganha coluna de data de empréstimo. A cópia semanal no Google Sheets é a exceção: ela exporta todos os campos de `Book` (`BOOK_SHEET_HEADERS: Record<keyof Book, string>`), então ganha a coluna "Emprestado em" logo depois de "Emprestado para".
- Mudar a granularidade "há N meses", que continua sendo `floor(dias / 30)`.

## Decisions

### 1. Coluna `lent_at timestamptz NULL` com backfill a partir de `updated_at`

Um `timestamptz` guarda o instante exato. O dia de calendário é derivado na hora de exibir, no fuso de quem vê, então trocar de fuso não exige migrar dados. A migration é gerada com `pnpm db:generate` e ganha à mão, depois de um `--> statement-breakpoint`, o backfill `UPDATE books SET lent_at = updated_at WHERE status = 'emprestado'`.

- *Alternativa: coluna `date`.* Ela fixaria o dia no fuso de quem emprestou e perderia a hora. Foi descartada.
- *Alternativa: backfill com `now()`.* Todos os empréstimos atuais apareceriam como "hoje". `updated_at` erra para menos só quando houve edição depois do empréstimo, que é o mesmo erro que o usuário já vê hoje. Por isso o deploy não piora nada.

### 2. O servidor decide `lentAt` dentro do próprio `UPDATE`

`lentAt` fica fora de `BookFields`, que vira `Omit<Book, "id" | "createdAt" | "updatedAt" | "lentAt">`. Com isso o zod da API descarta o campo vindo do cliente e o form não o enxerga. Em `toValues`, quando o patch traz `status`:

- se o status é `emprestado`: `lentAt = sql\`CASE WHEN ${books.status} = 'emprestado' THEN coalesce(${books.lentAt}, now()) ELSE now() END\``. No `SET` de um `UPDATE` do Postgres, as colunas referenciadas têm os valores antigos da linha, então a transição é detectada sem leitura extra e sem corrida;
- se o status é outro: `lentAt = null`;
- se o patch não traz `status`, `lentAt` não entra no `SET`.

Para inserts (`createBook`, `replaceBooks` e os inserts de `applyMerge`), uma função irmã, `toInsertValues`, resolve `lentAt` em JS: o `lentAt` informado pelo chamador (só `replaceBooks`, a partir do backup ou do seed) se o status for `emprestado`; senão `new Date()`; e `null` fora do status. Os updates de `applyMerge` passam a usar o mesmo `CASE`. Hoje eles montam `{ ...toValues(rest), status }` para não limpar o `borrower`, e o `lentAt` vai ser calculado também nesse caminho.

- *Alternativa: o cliente mandar `lentAt` no `PATCH` do `confirmLend`.* Daria certo só no caminho do modal. Seletor de status, lote e planilha continuariam errados, e o cliente poderia forjar o valor. Foi descartada.
- *Alternativa: `SELECT` do status antes do `UPDATE`.* Custa uma ida a mais ao banco e abre uma corrida entre a leitura e a escrita. O `CASE` resolve tudo numa única instrução.
- *Alternativa: trigger no banco.* Funcionaria, mas espalha regra de negócio para fora de `lib/services` e não funciona igual no PGlite dos testes sem trabalho extra. Foi descartada.

### 3. Sem `lentAt` otimista no cliente

O cache otimista (`lib/client/book-cache.ts`, que está sendo mexido no BP-05) trabalha com `Partial<BookFields>`, e `lentAt` não faz parte desse tipo. Ao emprestar, o badge aparece "Com Fulano" sem a duração até o servidor responder. Em seguida `settleBook` aplica o `Book` do servidor, já com `lentAt`. Ao devolver, o badge some junto com o status, então o `lentAt` antigo nunca chega a ser exibido.

- *Alternativa: colocar `lentAt` no patch otimista.* Exigiria estender `Patch`, `pickFields` e `revertBookPatch` para um campo que o cliente não controla, mexendo no código do BP-05 ainda em andamento. O ganho seria só evitar uma fração de segundo sem "· hoje". Foi descartada.

### 4. `lentDurationLabel(d, now, tz)` com dias de calendário via `wallClock`

A assinatura nova é `lentDurationLabel(d, now, tz)`:

```
dayNumber(date, tz) = Date.UTC(w.year, w.month, w.day) / 86_400_000,  w = wallClock(date, tz)
diffDays = dayNumber(now, tz) − dayNumber(lent, tz)
```

Uma string só com data (`YYYY-MM-DD`) já é um dia de calendário e vira `Date.UTC(y, m - 1, d)` direto, sem conversão de fuso. As faixas não mudam: `<= 0` dá "hoje", `1` dá "há 1 dia", `< 30` dá "há N dias", e acima disso valem os meses. Os chamadores passam `new Date(app.now)` e `app.tz` do `useApp()`. É o mesmo par que `dashboard()` já usa, então o SSR e o cliente renderizam o mesmo texto e o horário fixo dos testes vale também para o rótulo.

- *Alternativa: `new Date()` e o fuso do navegador, com `suppressHydrationWarning`.* Esconderia a divergência em vez de evitá-la e não respeitaria `FIXED_NOW`. Foi descartada.
- *Consequência:* `app.now` é o instante do carregamento da página. Com a aba aberta de um dia para o outro, o rótulo só avança no próximo carregamento, como o restante do Painel. Fica aceito.

### 5. Backup com `lentAt` opcional

`toBackup` acrescenta `lentAt` (ISO) só em livros emprestados com valor. O standalone ignora chaves desconhecidas, então a compatibilidade continua. Na restauração, o parse produz `BookFields & { lentAt?: string | null }`, e `replaceBooks` aceita esse tipo e repassa o valor a `toInsertValues`. Datas inválidas ou futuras são descartadas, como já acontece com os números fora da faixa no BP-03, e no lugar delas entra o instante da restauração.

## Risks / Trade-offs

- [O backfill usa `updated_at`, que pode ser posterior ao empréstimo real] → É o valor que o usuário já vê hoje, então nada regride. A partir do deploy as novas edições não mexem mais na data.
- [A migration roda no Neon de produção e de preview] → É aditiva (coluna nula mais um `UPDATE` limitado aos emprestados). Pode rodar antes do deploy do código: o código antigo ignora a coluna.
- [Fixtures e testes que montam `Book` literal quebram no typecheck com o campo obrigatório novo] → Atualizar `tests/support/reference.ts` e os testes de `lib/domain` e `lib/client`. O próprio typecheck aponta cada caso.
- [O `CASE` com `sql` dentro de `.set()` do Drizzle precisa do tipo certo da coluna] → Tipar como `sql<Date | null>` e cobrir com teste de integração no PGlite (`tests/integration/api.test.ts`): emprestar, favoritar, editar as anotações, mudar o `borrower`, devolver e emprestar de novo.
- [Conflito com o BP-05 em andamento em `lib/client/book-cache.ts` e `hooks/use-books.ts`] → A decisão 3 evita mexer nesses arquivos. Fora `tests/support` e os fixtures, a change não toca no cache.

## Migration Plan

1. `pnpm db:generate` gera `drizzle/0002_*.sql`. Acrescentar o `UPDATE` de backfill no fim do arquivo.
2. Local: `pnpm db:migrate`, `pnpm test` e o e2e dos empréstimos.
3. Deploy: não tem passo manual. O `buildCommand` da Vercel (`pnpm vercel-build`) roda `pnpm db:migrate` antes do `next build` em cada ambiente, então a coluna existe antes de o código novo entrar no ar. Se a migration falhar, o build falha e a versão atual continua no ar.
4. Rollback: o código anterior não lê `lent_at`, então reverter o deploy basta. A coluna pode ficar; removê-la exigiria outra migration e não é necessário.

## Open Questions

- Quando um livro já emprestado muda de pessoa (`borrower` "Ana" → "Bruno") sem sair do status, isso é um novo empréstimo? Esta change mantém a data, tratando o caso como correção de nome. Se o fluxo de UI vier a permitir "passar adiante", isso pede outra regra.
