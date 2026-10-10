## Why

Só a usuária `ana` usa `/api/goals` nos testes de integração (BP-02 do `BUGPOOL_REPORT.md`, HIGH). Uma regressão que tirasse `userId` do `where` de `getGoal` ou do alvo do `onConflictDoUpdate` de `setGoal` vazaria ou sobrescreveria a meta de outra pessoa, e nenhum teste falharia. Os limites de `target` e do ano também não estão cobertos.

## What Changes

- Testes de integração de isolamento: a meta que um usuário grava não aparece nem é sobrescrita para outro usuário no mesmo ano.
- Testes de borda do `target` (1 e 1000 aceitos; 1001 e 1.5 rejeitados com 400) e do ano na URL (1000 e 9999 aceitos; 999 e 10000 respondem 404).
- A spec de `reading-dashboard` passa a declarar o isolamento por usuário e os limites que o código já aplica.
- Nenhuma mudança de código de produção: o comportamento atual já está correto, a change só o fixa com testes.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `reading-dashboard`: o requisito "Meta de leitura por ano" passa a explicitar que a meta é isolada por usuário, que `target` é inteiro de 1 a 1000 e que o ano da rota vai de 1000 a 9999.

## Impact

- `tests/integration/api.test.ts` (bloco `metas`).
- Sem mudança em `lib/services/goals.ts`, `lib/validation/api.ts` ou na rota, sem migration, sem mudança de API.
