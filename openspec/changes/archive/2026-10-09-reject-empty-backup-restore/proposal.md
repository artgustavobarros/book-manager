## Why

Restaurar um backup vazio ou inválido apagava o acervo inteiro (BP-01 do `BUGPOOL_REPORT.md`, HIGH). `importSchema` aceita qualquer array, `fromBackup` descarta os itens sem título e devolvia `[]`, e `replaceBooks` fazia `DELETE` de todos os livros sem inserir nada, respondendo `200 {count: 0}`. O diálogo de confirmação ainda contava os itens brutos ("O backup tem 2 itens…"), então nada avisava o usuário.

## What Changes

- `fromBackup` lança `InvalidBackupError` quando nenhum item tem título; `POST /api/books/import` responde 400 "Arquivo inválido." sem tocar no acervo.
- O `RestoreHost` aplica a mesma regra antes da confirmação: arquivo sem livros válidos mostra o toast de arquivo inválido sem chamar a API.
- A confirmação passa a contar livros válidos e a informar quantos itens serão ignorados.
- Backups parcialmente válidos continuam aceitos, sem limite percentual: o usuário vê o que será ignorado antes de confirmar.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `data-portability`: o requisito "Restaurar backup JSON" passa a rejeitar backups sem livros válidos e a mostrar a contagem de válidos e ignorados na confirmação.

## Impact

- `lib/domain/backup.ts`, `components/app/restore-host.tsx`.
- Testes: `lib/domain/backup.test.ts`, `tests/integration/api.test.ts`, `tests/e2e/books.spec.ts`.
- Sem mudança de API pública além do novo 400, sem migration.
