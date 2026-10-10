## Context

`getGoal` filtra por `userId` e `year`, e `setGoal` faz upsert com alvo `(userId, year)`, a chave primária composta de `reading_goals`. A rota valida o ano com `yearParamSchema` (inteiro 1000–9999, senão 404) e o corpo com `goalSchema` (inteiro 1–1000, senão 400). O código está correto; falta teste que falhe se alguém quebrar o filtro ou o alvo do upsert.

## Goals / Non-Goals

**Goals:** cobrir com testes de integração o isolamento de metas entre usuários e os limites de `target` e do ano.

**Non-Goals:** mudar o código de metas; o ano congelado na virada do ano (pista LOW 5 do relatório); testes de isolamento do import de backup (BP-03).

## Decisions

- **Testes na integração, não no serviço isolado.** Os testes passam pelas rotas (`GET`/`PUT /api/goals/[year]`) com as sessões reais de `ana` e `bia`, que já existem no arquivo. Assim cobrem a sessão → `userId` → serviço → banco de uma vez. Um teste unitário de `goals.ts` precisaria mockar o drizzle e não pegaria um alvo de upsert errado.
- **Ano dedicado para o isolamento.** O teste existente já grava 25 para ana em 2026. Os novos testes usam outro ano (por exemplo 2030) para não depender da ordem dos `it`, e ainda escrevem nos dois sentidos (ana → bia e bia → ana), que é o que pega tanto o `where` quanto o alvo do `onConflictDoUpdate` errados.
- **Bordas dentro de um `it` por eixo.** Um `it` para `target` (1, 1000 aceitos; 0, 1001, 1.5 rejeitados, e a meta anterior se mantém) e outro para o ano (1000, 9999 aceitos; 999, 10000 com 404, em `GET` e `PUT`).
- **Spec por MODIFIED.** O requisito "Meta de leitura por ano" já existe; o delta copia o bloco inteiro e acrescenta o isolamento, os limites e três cenários.

## Risks / Trade-offs

- [O teste passa hoje, então não prova sozinho que detecta a regressão] → durante a implementação, remover temporariamente `eq(readingGoals.userId, userId)` de `getGoal` e depois trocar o alvo do upsert para `[readingGoals.year]`, confirmar que o teste de isolamento falha nos dois casos e reverter.
