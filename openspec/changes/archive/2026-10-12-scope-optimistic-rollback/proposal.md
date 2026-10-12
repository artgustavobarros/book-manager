## Why

Quando uma mutação otimista do acervo falha, `useBookActions` grava de volta no cache o array inteiro de livros capturado no `onMutate` (BP-04 do `BUGPOOL_REPORT.md`). Tudo o que mudou no cache entre o início e a falha some da tela: outro livro criado, editado ou excluído, ou as capas aplicadas por `patchLocal`. Como `staleTime` é 60s e não há refetch ao focar a janela, a tela continua errada até a próxima busca e não condiz com o servidor.

## What Changes

- Quando um `update` falha, o rollback desfaz só os campos que essa mutação mudou no livro afetado. O resto do cache fica como está, inclusive mudanças mais recentes no mesmo livro.
- Quando um `remove` falha, o rollback reinsere só o livro excluído, perto da posição original. Se ele já estiver no cache, nada muda.
- Funções puras de cache em `lib/client/` aplicam o patch otimista e fazem o rollback. Testes unitários cobrem os cenários de concorrência.
- `snapshot()` e `fail(prev)`, que reescreviam o array inteiro, saem do hook.
- Na spec de `app-shell`, o requisito "Mutações sem falso sucesso" passa a dizer que desfazer uma ação que falhou não pode apagar outras mudanças.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `app-shell`: o requisito "Mutações sem falso sucesso" passa a limitar o rollback ao livro e aos campos da ação que falhou, com cenários de concorrência.

## Impact

- `hooks/use-books.ts`: `useBookActions`, nos ramos `update` e `remove`.
- Novo `lib/client/book-cache.ts` e o teste `lib/client/book-cache.test.ts`.
- Não muda API, rota, banco nem a assinatura de `useBookActions`. Quem chama o hook (`shelf-page`, `book-modals`, `use-auto-covers` e outros) continua igual.
