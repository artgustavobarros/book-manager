## Why

A sincronização da planilha deixa um "emprestado para" em livros que não estão emprestados (BP-14 do `BUGPOOL_REPORT.md`). O resto do app segue a regra de que fora do status "emprestado" não há com quem o livro esteja: a API, o lote e o backup limpam o `borrower`. O merge da planilha escapa dela em dois pontos:

- **Atualização:** `applyMerge` (`lib/services/books.ts`) separa o `status` e chama `toValues` sem ele. Quando a planilha leva um livro emprestado para "Lido", o status muda e o `borrower` fica. Além disso, `mergeSheet` copia a coluna "Emprestado para" para qualquer livro casado, mesmo com o status final diferente de "emprestado".
- **Inserção:** `mergeSheet` sobrescreve o `borrower` já filtrado por `legacyToFields` com o valor bruto da planilha.

O nome fantasma não aparece no badge, que só existe em livros emprestados. Mas ele volta ao modal "Emprestado para quem?" quando o livro é emprestado de novo, vai para o backup, o CSV e a cópia semanal no Google Sheets, e conta nos dados do livro.

## What Changes

- `mergeSheet` limpa quem pegou emprestado de todo livro casado cujo status final não é "emprestado". Isso também apaga um nome fantasma deixado por sincronizações anteriores.
- `mergeSheet` deixa de sobrescrever o `borrower` das inserções e usa o de `legacyToFields`, que só o mantém em livros emprestados.
- `applyMerge` grava as atualizações com `toUpdateValues(fields)`, como o PATCH e o lote. Sair de "emprestado" limpa `borrower` e `lentAt` também no servidor.
- O requisito "Merge que preserva dados locais" da spec `spreadsheet-sync` ganha a regra e os cenários.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `spreadsheet-sync`: no requisito "Merge que preserva dados locais", o merge MUST NOT deixar quem pegou emprestado em livro fora do status "emprestado".

## Impact

- `lib/domain/sheet.ts` (`mergeSheet`) e `lib/services/books.ts` (`applyMerge`).
- Testes em `lib/domain/sheet.test.ts` e `tests/integration/api.test.ts`.
- Não muda API, rota, banco nem a interface. O teste de paridade com o `runSync()` do standalone continua passando, porque o CSV de referência não tem nome em livro não emprestado.
- No mesmo PR, `.mcp.json` ganha a quebra de linha final, que faltava desde o PR #17 e quebrava o `pnpm lint`.
