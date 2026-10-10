## 1. Testes de integração

- [x] 1.1 Isolamento: ana grava 50 em 2030, bia lê 24; bia grava 7, ana continua lendo 50 e bia lê 7
- [x] 1.2 Limites do `target`: 1 e 1000 respondem 200 e persistem; 0, 1001 e 1.5 respondem 400 e a meta anterior se mantém
- [x] 1.3 Limites do ano: 1000 e 9999 respondem 200 em `GET` e `PUT`; 999 e 10000 respondem 404 em `GET` e `PUT`
- [x] 1.4 Prova de detecção: tirar o filtro de `userId` de `getGoal` e, depois, trocar o alvo do upsert para só `year`; confirmar que 1.1 falha nos dois casos e reverter

## 2. Verificação e registro

- [x] 2.1 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 2.2 `openspec validate test-goals-user-isolation --strict`
