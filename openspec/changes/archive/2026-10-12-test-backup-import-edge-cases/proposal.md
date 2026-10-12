## Why

O import de backup (`POST /api/books/import`) substitui o acervo inteiro, mas os testes de integração cobrem pouco: o caminho feliz (30 livros), o caso "não é array" e, desde o BP-01, os backups sem livros válidos (BP-03 do `BUGPOOL_REPORT.md`, HIGH, qa). Uma regressão que tirasse `userId` do `DELETE` de `replaceBooks` apagaria o acervo de todo mundo, e nenhum teste falharia. Além disso, `pages: "99999999999"` estoura a coluna `integer` e o restore inteiro falha com 500, porque `legacyToFields` não aplica os limites de `bookFieldsSchema` (parte numérica do BP-11).

## What Changes

- Testes de integração do import:
  - isolamento: o import de ana não toca nos livros de bia;
  - reimportar o mesmo backup não duplica, e um backup sem `order` depois de um acervo de 30 livros numera a partir de 1, não de 31;
  - mais de 20000 itens dá 400 sem apagar nada;
  - sem sessão dá 401 sem apagar nada;
  - números fora da faixa (`pages: "99999999999"` e similares) são descartados: o restore responde 200 com o campo `null`.
- Os casos `[]` e `[{}]` (400 sem apagar nada) já estão cobertos desde o BP-01 e continuam como estão.
- Correção em `lib/domain/backup.ts`: `legacyToFields` descarta (`null`) os valores de `orderNo`, `yearPublished`, `pages` e `yearRead` acima dos limites de `bookFieldsSchema`, em vez de deixar o INSERT estourar. Os limites passam a ser constantes de domínio compartilhadas entre o schema e o backup.
- A spec `data-portability` declara isolamento, autenticação, limite de tamanho e o descarte de números fora da faixa.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `data-portability`: o requisito "Restaurar backup JSON" passa a explicitar que só o acervo do próprio usuário é substituído, que a rota exige sessão, que backups com mais de 20000 itens são rejeitados, que reimportar não duplica e que números fora da faixa do modelo são descartados (o livro é importado com o campo vazio).

## Impact

- `tests/integration/api.test.ts` (bloco `importar backup`).
- `lib/domain/backup.ts` (`legacyToFields` e um helper de inteiro com teto), `lib/domain/backup.test.ts`.
- `lib/domain/types.ts` (constantes de limite) e `lib/validation/book.ts` (passa a usá-las, sem mudar os valores).
- Fica fora, no restante do BP-11: `coverUrl` (esquema e tamanho), tamanho máximo dos textos e o merge da planilha (`lib/domain/sheet.ts`).
- Sem migration e sem mudança no contrato da API além de 500 → 200 para números fora da faixa.
