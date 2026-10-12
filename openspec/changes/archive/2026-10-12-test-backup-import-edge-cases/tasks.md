## 1. Limites numéricos no import

- [x] 1.1 Criar `BOOK_INT_MAX` em `lib/domain/types.ts` (`orderNo` 1.000.000, `yearPublished` 9999, `pages` 100.000, `yearRead` 9999) e usar essas constantes em `bookFieldsSchema` (`lib/validation/book.ts`), sem mudar os valores
- [x] 1.2 `toPositiveInt(v, max?)` em `lib/domain/backup.ts`: acima de `max`, devolve `null`; sem `max`, o comportamento não muda
- [x] 1.3 `legacyToFields` passa o teto de cada campo (`orderNo`, `yearPublished`, `pages`, `yearRead`)
- [x] 1.4 Testes unitários em `lib/domain/backup.test.ts`: teto do `toPositiveInt` (no limite é aceito, acima vira `null`) e `fromBackup` com `pages: "99999999999"`, `year: "99999"` e `order: "99999999999"`, que viram `null`/`null` e o nº é reatribuído

## 2. Testes de integração do import

- [x] 2.1 Isolamento: bia cria livros, ana importa o backup e a lista de bia continua idêntica
- [x] 2.2 Reimport: importar o backup de 30 livros duas vezes dá 30 livros, com `orderNo` de 1 a 30 sem repetição
- [x] 2.3 Numeração: com 30 livros no acervo, importar um backup sem `order` numera a partir de 1
- [x] 2.4 Mais de 20000 itens responde 400 e o acervo continua igual
- [x] 2.5 Sem sessão responde 401 e o acervo continua igual
- [x] 2.6 `pages: "99999999999"` responde 200, com `pages` `null` e os demais campos mantidos
- [x] 2.7 Prova de detecção: tirar o filtro de `userId` do `DELETE` de `replaceBooks`, confirmar que 2.1 falha e reverter

## 3. Verificação e registro

- [x] 3.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 3.2 `openspec validate test-backup-import-edge-cases --strict`
- [x] 3.3 Atualizar o BP-03 (e a parte numérica do BP-11) no `BUGPOOL_REPORT.md`, se o relatório for mantido
