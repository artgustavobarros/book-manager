## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-12` a partir da `main` atualizada

## 1. Testes primeiro

- [x] 1.1 Em `lib/domain/shelf.test.ts`, trocar a expectativa do caso de editora vazia: com `null` e "Zahar", o livro sem editora fica por último. Atualizar o comentário: aqui o app diverge do standalone de propósito (BP-12)
- [x] 1.2 Adicionar casos: editoras "Zahar", "Abril", `null`, `""` e `"  "` em `editora` dão Abril, Zahar e os três vazios na ordem de entrada; o mesmo para `autor`; e acento e caixa continuam ignorados entre os preenchidos ("Érico" e "eça" na ordem pt-BR)
- [x] 1.3 Prova de detecção: com `shelf.ts` da `main`, os casos novos falham

## 2. Correção

- [x] 2.1 Em `lib/domain/shelf.ts`, criar `cmpEmptyLast` (vazio = nulo, `""` ou só espaços) ao lado dos helpers `pg` e `ordN`
- [x] 2.2 Usar `cmpEmptyLast` em `COMPARATORS.autor` e `COMPARATORS.editora`, removendo o sentinela `"~"`
- [x] 2.3 Os testes de 1.1 e 1.2 passam, e "estante × standalone" continua passando

## 3. Verificação e registro

- [x] 3.1 Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm test:e2e`, comparando as falhas do e2e com as 9 já conhecidas da `main`
- [x] 3.2 `openspec validate sort-empty-author-publisher-last --strict`
- [x] 3.3 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/shelf-browsing/spec.md`), merge na `main` e `main` local atualizada
