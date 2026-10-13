## Why

Na Estante, as ordenações "Editora · A–Z" e "Autor(a) · A–Z" mostram primeiro os livros sem editora ou sem autor (BP-12 do `BUGPOOL_REPORT.md`). Em "Editora", o livro sem editora vira `"~"` antes da comparação, para ir para o fim, mas o collator pt-BR ordena `~` antes das letras. `["Zed", "~", "Abril"]` fica `["~", "Abril", "Zed"]`. Em "Autor(a)", o `cmp` troca o nulo por `""`, que também vem antes de tudo. Quem ordena por editora para achar um livro começa a lista pelos que não têm o dado.

## What Changes

- Em "Autor(a) · A–Z" e "Editora · A–Z", livros com o campo vazio (nulo, `""` ou só espaços) ficam no fim, depois de todos os preenchidos. A ordem entre eles continua a de entrada (sort estável).
- Os livros preenchidos continuam na ordem pt-BR de hoje, sem diferenciar acentos nem maiúsculas.
- O sentinela `"~"` sai de `editora`.
- As outras ordenações não mudam. Nelas, os vazios já ficam no fim: Nº, Lançamento, Aquisição e Páginas.
- O teste unitário que fixava o comportamento do standalone ("editora vazia vira `~`, que o ICU ordena antes das letras") passa a esperar os vazios no fim. **Diverge do standalone de propósito** nesse ponto.
- O requisito "Ordenação" da spec `shelf-browsing` ganha a regra e um cenário.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `shelf-browsing`: no requisito "Ordenação", as ordenações por Autor(a) e por Editora MUST pôr os livros sem o campo no fim.

## Impact

- `lib/domain/shelf.ts` (`COMPARATORS.autor` e `COMPARATORS.editora`).
- `lib/domain/shelf.test.ts`: o caso de editora vazia muda de expectativa e ganha casos de autor vazio e de vários vazios.
- O teste "estante × standalone" continua passando: nenhum livro da fixture de referência tem autor ou editora vazios.
- Não muda API, rota, banco nem UI. Só a ordem dos livros sem autor ou sem editora.
