## Why

Devolver um livro apaga o ano em que ele foi lido (BP-07 do `BUGPOOL_REPORT.md`). `returnBook` (`components/app/app-provider.tsx`) usa `returnStatus = "nao-lido"` por padrão e, com esse status, faz `yearRead = null`. Os três pontos de devolução (o ✕ do badge no card e na linha da Estante e o "Devolver" do Painel) chamam com o padrão. Um livro lido este ano, emprestado e depois devolvido, perde o ano e deixa de contar na meta anual e em Dados. Não há histórico para recuperar o ano perdido.

Além disso, enquanto está emprestado, o livro já não conta na meta: o Painel e Dados contam como lidos só os livros com status `lido`. Emprestar um livro lido derruba o contador da meta até a devolução.

## What Changes

- A devolução volta o livro para `lido` quando ele tem ano de leitura e para `nao-lido` quando não tem. Ela nunca altera o ano de leitura. O parâmetro `returnStatus` de `returnBook`, que nenhum chamador usa, sai.
- Para as contagens, livro lido passa a ser o de status `lido` ou o emprestado com ano de leitura. Isso vale para a meta anual, "Lidos no ano", os KPIs Lidos e Páginas lidas do Painel e todos os números de lidos em Dados.
- "Desfazer leitura" em "Lidos no ano" num livro emprestado só limpa o ano de leitura. O livro continua emprestado com a mesma pessoa.
- Duas funções puras em `lib/domain/status.ts` concentram as regras: `isRead(book)` e `returnStatus(book)`.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `book-catalog`: o requisito "Fluxo ágil de empréstimo e devolução" troca "lido ou quero-ler" (status que não existe) pela regra do ano de leitura e ganha o cenário do critério de aceite.
- `reading-dashboard`: "Lidos no ano" define livro lido incluindo o emprestado com ano de leitura, e "Gestão ágil de leitura ativa no Painel" ganha o cenário de desfazer a leitura de um livro emprestado.
- `collection-insights`: "Escopo dos gráficos" passa a usar a mesma definição de livro lido.

## Impact

- `components/app/app-provider.tsx`: `returnBook` e `undoRead`, e a assinatura de `returnBook` em `AppContextValue`.
- `lib/domain/status.ts`: `isRead` e `returnStatus`. `lib/domain/dashboard.ts` e `lib/domain/insights.ts` usam `isRead`.
- Testes em `lib/domain/status.test.ts`, `dashboard.test.ts`, `insights.test.ts` e um e2e em `tests/e2e/fixes.spec.ts`.
- Não muda API, rota nem banco. O servidor já limpa `borrower` e `lentAt` quando o livro sai de `emprestado`.
